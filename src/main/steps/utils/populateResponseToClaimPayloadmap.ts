import type { Request } from 'express';

import type { CcdCase, PossessionClaimResponse } from '@interfaces/ccdCase.interface';
import { CcdCaseModel } from '@interfaces/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';

// Wrap the possession claim response in a ccd case object and submit via ccdCaseService
export const buildCcdCaseForPossessionClaimResponse = async (
  req: Request,
  possessionClaimResponse: PossessionClaimResponse
): Promise<CcdCase> => {
  const existingValidatedCase = req.res?.locals?.validatedCase;
  const { id: caseId } = existingValidatedCase ?? { id: '' };
  const ccdCase: CcdCase = {
    id: caseId,
    data: {
      possessionClaimResponse,
    },
  };
  const updatedCase = await ccdCaseService.updateDraftRespondToClaim(
    req.session?.user?.accessToken,
    ccdCase.id,
    ccdCase.data as Record<string, unknown>
  );

  if (req.res?.locals) {
    req.res.locals.validatedCase = new CcdCaseModel({
      id: updatedCase.id || caseId,
      data: updatedCase.data || existingValidatedCase?.data || {},
    });
  }

  return updatedCase;
};
