import type { Request } from 'express';

/**
 * Returns true when ANY selected claim ground is marked as rent arrears.
 */
export const hasAnyRentArrearsGround = (req: Request): boolean => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const claimGroundSummaries = caseData?.claimGroundSummaries;

  if (!Array.isArray(claimGroundSummaries)) {
    return false;
  }

  return claimGroundSummaries.some(ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES');
};
