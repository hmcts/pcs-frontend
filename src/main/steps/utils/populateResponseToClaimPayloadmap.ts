import { Request } from 'express';

import { CcdCase, PossessionClaimResponse } from '../../interfaces/ccdCase.interface';
import { ccdCaseService } from '../../services/ccdCaseService';

// Wrap the possession claim response in a ccd case object and submit via ccdCaseService
export const buildCcdCaseForPossessionClaimResponse = async (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse,
): Promise<CcdCase> => {
  const ccdCase: CcdCase = {
    id: req.res?.locals.validatedCase?.id,
    data: {
      possessionClaimResponse,
    },
  };
  return ccdCaseService.updateDraftRespondToClaim(req.session?.user?.accessToken, ccdCase.id, ccdCase.data);
};
