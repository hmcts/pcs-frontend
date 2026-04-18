import { Request } from 'express';
import { cloneDeep } from 'lodash';

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

  // Strip immutable claimant-entered fields that the backend rejects
  if (defendantOnly.defendantContactDetails?.party) {
    delete (defendantOnly.defendantContactDetails.party as Record<string, unknown>).nameKnown;
    delete (defendantOnly.defendantContactDetails.party as Record<string, unknown>).addressKnown;
    delete (defendantOnly.defendantContactDetails.party as Record<string, unknown>).addressSameAsProperty;
  } else {
    defendantOnly.defendantContactDetails = { party: {} };
  }

  return defendantOnly as DraftDefendantResponse;
};

// Convenience wrapper: saves the draft defendant response and refreshes validatedCase on the request.
export const saveDraftDefendantResponse = async (req: Request, response: PossessionClaimResponse): Promise<void> => {
  const accessToken = req.session?.user?.accessToken || '';
  const caseId = req.res?.locals.validatedCase?.id || '';

  const updatedCase = await ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, {
    possessionClaimResponse: response,
  });

  // Refresh validatedCase with the merged response from the backend
  if (req.res?.locals) {
    const mergedId = updatedCase.id || caseId;
    const mergedData = { ...req.res.locals.validatedCase?.data, ...updatedCase.data };
    req.res.locals.validatedCase = new CcdCaseModel({ id: mergedId, data: mergedData });
  }
};
