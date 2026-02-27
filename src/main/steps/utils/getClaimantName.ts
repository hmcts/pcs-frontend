import type { Request } from 'express';

export const getClaimantName = (req: Request, fallback?: string): string | undefined => {
  const claimantNameFromValidatedCase = req.res?.locals?.validatedCase?.data?.possessionClaimResponse
    ?.claimantOrganisations?.[0]?.value as string | undefined;

  const claimantNameFromSession = req.session?.ccdCase?.data?.claimantName as string | undefined;

  return claimantNameFromValidatedCase || claimantNameFromSession || fallback;
};