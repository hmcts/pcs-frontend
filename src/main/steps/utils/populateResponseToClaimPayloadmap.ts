import { Request } from 'express';

import { CcdCase, PossessionClaimResponse } from '../../interfaces/ccdCase.interface';

// wrap the possession claim response in a ccd case object so it can pass through ccd validation
export const buildCcdCaseForPossessionClaimResponse = (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse,
  submitDraftAnswers: boolean
): CcdCase => ({
  id: req.session?.ccdCase?.id ?? req.params.caseReference ?? '',
  data: {
    possessionClaimResponse,
    submitDraftAnswers,
  },
});
