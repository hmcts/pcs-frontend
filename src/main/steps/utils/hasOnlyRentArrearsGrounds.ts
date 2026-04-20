import type { Request } from 'express';

/**
 * Returns true when ALL selected claim grounds are marked as rent arrears.
 */
export const hasOnlyRentArrearsGrounds = (req: Request): boolean => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const claimGroundSummaries = caseData?.claimGroundSummaries;

  if (!Array.isArray(claimGroundSummaries) || claimGroundSummaries.length === 0) {
    return false;
  }

  return claimGroundSummaries.every(ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES');
};
