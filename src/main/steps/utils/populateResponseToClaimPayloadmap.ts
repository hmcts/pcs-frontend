import type { Request } from 'express';

import type { CcdSectionStatusItem, PossessionClaimResponse } from '@services/ccdCase.interface';
import { type CcdCase, CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';

type PlainRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeRecords(base: PlainRecord, update: PlainRecord): PlainRecord {
  const merged: PlainRecord = { ...base };

  for (const [key, updateValue] of Object.entries(update)) {
    const baseValue = merged[key];

    if (isPlainRecord(baseValue) && isPlainRecord(updateValue)) {
      merged[key] = mergeRecords(baseValue, updateValue);
      continue;
    }

    merged[key] = updateValue;
  }

  return merged;
}

function parseSectionStatusListItem(item: unknown): [string, string] | null {
  if (!isPlainRecord(item)) {
    return null;
  }
  const value = item.value;
  if (!isPlainRecord(value)) {
    return null;
  }
  const sectionId = value.sectionId;
  const status = value.status;
  if (typeof sectionId !== 'string' || typeof status !== 'string') {
    return null;
  }
  return [sectionId, status];
}

function sectionStatusesFromList(items: unknown[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const pair = parseSectionStatusListItem(item);
    if (pair) {
      map.set(pair[0], pair[1]);
    }
  }
  return map;
}

function sectionStatusesFromRecord(raw: PlainRecord): Map<string, string> {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') {
      map.set(k, v);
    }
  }
  return map;
}

function parseSectionStatusesToMap(raw: unknown): Map<string, string> {
  if (raw === null || raw === undefined) {
    return new Map();
  }
  if (Array.isArray(raw)) {
    return sectionStatusesFromList(raw);
  }
  if (isPlainRecord(raw)) {
    return sectionStatusesFromRecord(raw);
  }
  return new Map();
}

function mapToSectionStatusItems(map: Map<string, string>): CcdSectionStatusItem[] {
  return [...map.entries()].map(([sectionId, status]) => ({
    value: { sectionId, status },
  }));
}

function mergeSectionStatusesIntoPossessionClaimResponse(
  req: Request,
  possessionClaimResponse: PossessionClaimResponse
): PossessionClaimResponse {
  const incomingDr = possessionClaimResponse.defendantResponses;
  const patchRaw = incomingDr?.sectionStatuses as unknown;
  if (patchRaw === undefined) {
    return possessionClaimResponse;
  }

  const existingRaw =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.sectionStatuses;

  const merged = parseSectionStatusesToMap(existingRaw);
  for (const [k, v] of parseSectionStatusesToMap(patchRaw)) {
    merged.set(k, v);
  }

  return {
    ...possessionClaimResponse,
    defendantResponses: {
      ...incomingDr,
      sectionStatuses: mapToSectionStatusItems(merged),
    },
  };
}

// Wrap the possession claim response in a ccd case object and submit via ccdCaseService
export const buildCcdCaseForPossessionClaimResponse = async (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse
): Promise<CcdCase> => {
  const existingValidatedCase = req.res?.locals?.validatedCase;
  const { id: caseId } = existingValidatedCase ?? { id: '' };
  const normalizedResponse = mergeSectionStatusesIntoPossessionClaimResponse(req, possessionClaimResponse);
  const ccdCase: CcdCase = {
    id: caseId,
    data: {
      possessionClaimResponse: normalizedResponse,
    },
  };
  const updatedCase = await ccdCaseService.updateDraftRespondToClaim(
    req.session?.user?.accessToken,
    ccdCase.id,
    ccdCase.data as Record<string, unknown>
  );

  if (req.res?.locals) {
    const existingData = (existingValidatedCase?.data ?? {}) as PlainRecord;
    const updatedData = (updatedCase.data ?? {}) as PlainRecord;
    const mergedData = mergeRecords(existingData, updatedData);

    req.res.locals.validatedCase = new CcdCaseModel({
      id: updatedCase.id || caseId,
      data: mergedData,
    });
  }

  return updatedCase;
};
