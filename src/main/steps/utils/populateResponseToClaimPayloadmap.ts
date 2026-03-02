import { Request } from 'express';

import { CcdCase, PossessionClaimResponse } from '../../interfaces/ccdCase.interface';

import { ccdCaseService } from '@services/ccdCaseService';

// Wrap the possession claim response in a ccd case object and submit via ccdCaseService
export const buildCcdCaseForPossessionClaimResponse = async (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse,
  submitDraftAnswers: boolean
): Promise<CcdCase> => {
  const ccdCase: CcdCase = {
    id: req.res?.locals.validatedCase?.id,
    data: {
      possessionClaimResponse,
      submitDraftAnswers: submitDraftAnswers ? 'Yes' : 'No',
    },
  };
  return ccdCaseService.submitResponseToClaim(req.session?.user?.accessToken, ccdCase);
};
