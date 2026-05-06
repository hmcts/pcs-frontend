import type { Request } from 'express';

export const isSomethingElseCounterClaim = (req: Request): boolean => {
  const claimType =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim?.claimType;
  return claimType === 'SOMETHING_ELSE';
};
