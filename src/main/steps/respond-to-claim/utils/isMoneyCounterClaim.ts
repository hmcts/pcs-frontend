import type { Request } from 'express';

export const isMoneyCounterClaim = async (req: Request): Promise<boolean> => {
  const claimType =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim?.claimType;
  return claimType === 'PAYMENT_OR_COMPENSATION' || claimType === 'BOTH';
};
