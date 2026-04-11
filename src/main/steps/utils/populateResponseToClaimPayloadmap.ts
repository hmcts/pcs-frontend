import { Request } from 'express';
import { cloneDeep } from 'lodash';

import { CcdCase, PossessionClaimResponse } from '../../interfaces/ccdCase.interface';

import { ccdCaseService } from '@services/ccdCaseService';

// Get a deep clone of defendant-only fields from the existing draft/case data
export const getDraftDefendantResponse = (req: Request): PossessionClaimResponse => {
  const existing = req.res?.locals?.validatedCase?.data?.possessionClaimResponse;
  const defendantOnly: PossessionClaimResponse = {};
  if (existing?.defendantResponses) {
    defendantOnly.defendantResponses = cloneDeep(existing.defendantResponses);
  }
  if (existing?.defendantContactDetails) {
    defendantOnly.defendantContactDetails = cloneDeep(existing.defendantContactDetails);
    // Strip immutable claimant-entered fields that the backend rejects
    if (defendantOnly.defendantContactDetails?.party) {
      delete (defendantOnly.defendantContactDetails.party as Record<string, unknown>).nameKnown;
      delete (defendantOnly.defendantContactDetails.party as Record<string, unknown>).addressKnown;
      delete (defendantOnly.defendantContactDetails.party as Record<string, unknown>).addressSameAsProperty;
    }
  }
  return defendantOnly;
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
