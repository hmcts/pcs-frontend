import { Request } from 'express';
import { cloneDeep } from 'lodash';

import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../respond-to-claim/draftEvent';
import { normaliseRespondToClaimDraft } from '../respond-to-claim/normalise';

import { PossessionClaimResponse } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';

// Return type with pre-initialised top-level objects so callers can set/delete fields directly
export interface DraftDefendantResponse extends PossessionClaimResponse {
  defendantResponses: NonNullable<PossessionClaimResponse['defendantResponses']>;
  defendantContactDetails: {
    party: NonNullable<NonNullable<PossessionClaimResponse['defendantContactDetails']>['party']>;
  };
}

// Get a deep clone of defendant-only fields from the existing draft/case data.
// All nested objects are pre-initialised so callers can set/delete fields directly.
export const buildDraftDefendantResponse = (req: Request): DraftDefendantResponse => {
  const existing = req.res?.locals?.validatedCase?.data?.possessionClaimResponse;

  const defendantOnly: PossessionClaimResponse = {
    defendantResponses: existing?.defendantResponses ? cloneDeep(existing.defendantResponses) : {},
    defendantContactDetails: existing?.defendantContactDetails
      ? cloneDeep(existing.defendantContactDetails)
      : { party: {} },
  };

  if (!defendantOnly.defendantContactDetails?.party) {
    defendantOnly.defendantContactDetails = { party: {} };
  }

  return defendantOnly as DraftDefendantResponse;
};

// Convenience wrapper: normalises orphaned cross-page fields, saves the draft defendant response,
// and refreshes validatedCase on the request.
export const saveDraftDefendantResponse = async (req: Request, response: PossessionClaimResponse): Promise<void> => {
  const normalised = normaliseRespondToClaimDraft(response);

  const accessToken = req.session?.user?.accessToken || '';
  const caseId = req.res?.locals.validatedCase?.id || '';

  const updatedCase = await ccdCaseService.updateDraft(RESPOND_TO_CLAIM_DRAFT_EVENT, accessToken, caseId, {
    possessionClaimResponse: normalised,
  });

  // Refresh validatedCase locally with what we just wrote. We can't rely on
  // updatedCase.data — CCD's /validate?pageId= endpoint may return an empty or
  // diff-shaped body, so trusting it for downstream showCondition reads
  // (e.g. shouldShowPriorityDebtDetailsStep reads priorityDebts immediately after
  // priority-debts saves) leaves the request with stale defendant data and the
  // framework routes past the step that depends on the just-saved field.
  //
  // Instead: take the normalised payload we KNOW was persisted (defendantResponses
  // + defendantContactDetails — the whole defendant slice from buildDraftDefendantResponse)
  // and overlay it on top of claimant-side fields from existingPCR.
  if (req.res?.locals) {
    const mergedId = updatedCase.id || caseId;
    const existingData = req.res.locals.validatedCase?.data ?? {};
    const existingPCR = existingData.possessionClaimResponse ?? {};

    const mergedData = {
      ...existingData,
      possessionClaimResponse: {
        ...existingPCR,
        ...normalised,
      },
    };

    req.res.locals.validatedCase = new CcdCaseModel({ id: mergedId, data: mergedData });
  }
};
