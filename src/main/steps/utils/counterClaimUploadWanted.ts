import type { Request } from 'express';

import { YesNoEnum } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';

export const counterClaimUploadWanted = (req: Request): boolean => {
  const caseModel = req.res?.locals?.validatedCase;
  if (!(caseModel instanceof CcdCaseModel)) {
    return false;
  }
  return caseModel.defendantResponsesCounterClaimWantToUploadFiles === YesNoEnum.YES;
};
