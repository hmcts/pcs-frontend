import { Request } from 'express';
import { cloneDeep } from 'lodash';

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

  const updatedCase = await ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, {
    possessionClaimResponse: normalised,
  });

  // Refresh validatedCase with the merged response from the backend.
  // NOTE: this merge is shallow. updatedCase.data only carries the defendant slice
  // (defendantContactDetails + defendantResponses), so claimantOrganisations and
  // claimantEnteredDefendantDetails are STRIPPED from in-request validatedCase here.
  // Safe in practice because the next request runs a fresh START callback that
  // re-populates them. Don't read claimant fields off validatedCase post-save in the
  // same request — they're gone until the next START.
  if (req.res?.locals) {
    const mergedId = updatedCase.id || caseId;
    const mergedData = { ...req.res.locals.validatedCase?.data, ...updatedCase.data };
    req.res.locals.validatedCase = new CcdCaseModel({ id: mergedId, data: mergedData });
  }
};
