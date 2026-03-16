import type { Request } from 'express';

/**
 * Checks if the claim includes any rent arrears ground from CCD case data.
 *
 * Checks claimGroundSummaries array from CCD case data.
 * Returns true if ANY claim ground has isRentArrears: "Yes" (case-insensitive), false otherwise.
 */
export const hasAnyRentArrearsGround = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const claimGroundSummaries = caseData?.claimGroundSummaries;

  if (!Array.isArray(claimGroundSummaries)) {
    return false;
  }

  // Check if any claim ground has isRentArrears: "Yes" (case-insensitive)
  return claimGroundSummaries.some(ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES');
};
