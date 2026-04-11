import { Request } from 'express';
import { cloneDeep } from 'lodash';

import { CcdCase, HouseholdCircumstances, PossessionClaimResponse } from '../../interfaces/ccdCase.interface';

import { ccdCaseService } from '@services/ccdCaseService';

// Return type with pre-initialised nested objects so callers can set/delete fields directly
export interface DraftDefendantResponse extends PossessionClaimResponse {
  defendantResponses: NonNullable<PossessionClaimResponse['defendantResponses']> & {
    householdCircumstances: HouseholdCircumstances;
    paymentAgreement: NonNullable<NonNullable<PossessionClaimResponse['defendantResponses']>['paymentAgreement']>;
  };
  defendantContactDetails: {
    party: NonNullable<NonNullable<PossessionClaimResponse['defendantContactDetails']>['party']>;
  };
}

// Get a deep clone of defendant-only fields from the existing draft/case data.
// All nested objects are pre-initialised so callers can set/delete fields directly.
export const getDraftDefendantResponse = (req: Request): DraftDefendantResponse => {
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

  // Pre-initialise nested objects used by multiple steps
  defendantOnly.defendantResponses!.householdCircumstances =
    defendantOnly.defendantResponses!.householdCircumstances ?? {};
  defendantOnly.defendantResponses!.paymentAgreement = defendantOnly.defendantResponses!.paymentAgreement ?? {};

  return defendantOnly as DraftDefendantResponse;
};

// Save the full defendant response to the draft table (full replace)
export const saveDraftDefendantResponse = async (req: Request, response: PossessionClaimResponse): Promise<CcdCase> => {
  const ccdCase: CcdCase = {
    id: req.res?.locals.validatedCase?.id,
    data: {
      possessionClaimResponse: response,
    },
  };
  return ccdCaseService.updateDraftRespondToClaim(req.session?.user?.accessToken, ccdCase.id, ccdCase.data);
};
