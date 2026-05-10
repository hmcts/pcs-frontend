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

  // Refresh validatedCase with the merged response from the backend.
  // updatedCase.data only carries the defendant slice (defendantContactDetails +
  // defendantResponses). Deep-merge possessionClaimResponse so that claimant-side
  // fields (claimantOrganisations, claimantEnteredDefendantDetails) survive — they
  // are not echoed back by the BE mid-event by design.
  if (req.res?.locals) {
    const mergedId = updatedCase.id || caseId;
    const existingData = req.res.locals.validatedCase?.data ?? {};
    const existingPCR = existingData.possessionClaimResponse ?? {};
    const updatedPCR = updatedCase.data?.possessionClaimResponse ?? {};

    const mergedData = {
      ...existingData,
      ...updatedCase.data,
      possessionClaimResponse: { ...existingPCR, ...updatedPCR },
    };

    req.res.locals.validatedCase = new CcdCaseModel({ id: mergedId, data: mergedData });
  }
};
