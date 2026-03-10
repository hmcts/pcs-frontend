import type { Request } from 'express';

import type { CaseData } from '../../interfaces/ccdCase.interface';

export const hasOnlyRentArrearsGrounds = (req: Request): boolean => {
  const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
  const claimGroundSummaries = caseData?.claimGroundSummaries;

  if (!Array.isArray(claimGroundSummaries) || claimGroundSummaries.length === 0) {
    return false;
  }

  return claimGroundSummaries.every(ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES');
};
