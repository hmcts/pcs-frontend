import type { Request } from 'express';

export const hasOnlyRentArrearsGrounds = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const claimGroundSummaries = caseData?.claimGroundSummaries;

  if (!Array.isArray(claimGroundSummaries) || claimGroundSummaries.length === 0) {
    return false;
  }

  const hasRentArrearsGround = claimGroundSummaries.some(
    ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES'
  );

  if (!hasRentArrearsGround) {
    return false;
  }

  const allGroundsAreRentArrears = claimGroundSummaries.every(
    ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES'
  );

  return allGroundsAreRentArrears;
};
