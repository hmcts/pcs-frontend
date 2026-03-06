import type { Request } from 'express';

import type { CcdCase, PossessionClaimResponse } from '@interfaces/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

// Wrap the possession claim response in a ccd case object and submit via ccdCaseService
export const buildCcdCaseForPossessionClaimResponse = async (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse
): Promise<CcdCase> => {
  const { id: caseId } = req.res?.locals?.validatedCase ?? { id: '' };
  const ccdCase: CcdCase = {
    id: caseId,
    data: {
      possessionClaimResponse,
    },
  };
  return ccdCaseService.updateDraftRespondToClaim(req.session?.user?.accessToken, ccdCase.id, ccdCase.data);
};
