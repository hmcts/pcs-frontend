import type { Request } from 'express';

const DEFAULT_CLAIMANT_NAME = 'Treetops Housing';

export const getClaimantName = (req: Request): string => {
  const claimantName = req.res?.locals?.validatedCase?.claimantName;
  if (typeof claimantName !== 'string') {
    return DEFAULT_CLAIMANT_NAME;
  }

  const trimmed = claimantName.trim();
  return trimmed || DEFAULT_CLAIMANT_NAME;
};
