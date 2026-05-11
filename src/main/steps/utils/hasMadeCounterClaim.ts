import type { Request } from 'express';

export const hasMadeCounterClaim = (req: Request): boolean => {
  return req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.makeCounterClaim === 'YES';
};
