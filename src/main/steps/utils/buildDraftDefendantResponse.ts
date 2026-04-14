import { Request } from 'express';
import { cloneDeep } from 'lodash';

import { PossessionClaimResponse } from '../../interfaces/ccdCase.interface';

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
