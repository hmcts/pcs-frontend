import type { Request } from 'express';

/**
 * Check if defendant has draft response data.
 *
 * First checks selectedDefendantResponses (set in select-defendant step for multiple defendants).
 * Falls back to possessionClaimResponse.defendantResponses from the case data.
 */
export const doesDefendantHaveDraftResponse = (req: Request): boolean => {
  const selectedDefendantResponses =
    req.res?.locals.selectedDefendantResponses ??
    req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses;

  return Object.keys(selectedDefendantResponses ?? {}).length > 0;
};
