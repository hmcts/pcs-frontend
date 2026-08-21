import type { Request } from 'express';

import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../respond-to-claim/draftEvent';

import { type CcdCase, CcdCaseModel, type PossessionClaimResponse } from '@services/ccdCaseData.model';
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
  const existingValidatedCase = req.res?.locals.validatedCase;
  const { id: caseId } = existingValidatedCase ?? { id: '' };

  /**
   * CCD merges event data into the case one top-level field at a time, and possessionClaimResponse is a single
   * complex field, so whatever is sent replaces the whole of it. Each step supplies only the answers from its own
   * page, so those have to be sent merged over the answers already held - otherwise every earlier page's answers
   * are dropped and pcs-api persists a response containing nothing but the last page.
   *
   * The existing answers come from res.locals.validatedCase, which is populated from the respondPossessionClaim
   * start callback. pcs-api loads the unsubmitted draft into that response, so it is the accumulated draft rather
   * than only what has already been submitted.
   */
  const existingResponse = (existingValidatedCase?.data?.possessionClaimResponse ?? {}) as PlainRecord;
  const mergedResponse = mergeRecords(existingResponse, possessionClaimResponse as PlainRecord);

  const ccdCase: CcdCase = {
    id: caseId,
    data: {
      possessionClaimResponse: mergedResponse,
    },
  };
  const updatedCase = await ccdCaseService.updateDraft(
    RESPOND_TO_CLAIM_DRAFT_EVENT,
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
