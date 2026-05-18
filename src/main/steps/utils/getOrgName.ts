import type { Request } from 'express';

export const getOrganisationName = (req: Request): string => {
  const orgName = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]?.value;
  if (typeof orgName !== 'string') {
    return 'Treetops Housing';
  }

  const trimmed = orgName.trim();
  return trimmed || 'Treetops Housing';
};
