import type { Request } from 'express';

import type { CcdCase, PossessionClaimResponse } from '@interfaces/ccdCase.interface';
import { CcdCaseModel } from '@interfaces/ccdCaseData.model';
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

// Wrap the possession claim response in a ccd case object and submit via ccdCaseService
export const buildCcdCaseForPossessionClaimResponse = async (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse
): Promise<CcdCase> => {
  const existingValidatedCase = req.res?.locals?.validatedCase;
  const { id: caseId } = existingValidatedCase ?? { id: '' };
  const ccdCase: CcdCase = {
    id: caseId,
    data: {
      possessionClaimResponse,
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
