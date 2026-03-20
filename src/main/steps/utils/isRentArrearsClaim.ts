import type { Request } from 'express';

/**
 * Checks if the claim includes rent arrears from CCD case data.
 *
 * Checks claimGroundSummaries array from CCD case data.
 * Returns true if ANY claim ground has isRentArrears: "Yes" (case-insensitive), false otherwise.
 */
export const isRentArrearsClaim = async (req: Request): Promise<boolean> => {
  const validatedCase = req.res?.locals?.validatedCase;
  const claimGroundSummaries = validatedCase?.claimGroundSummaries;

  if (Array.isArray(claimGroundSummaries)) {
    // Check if any claim ground has isRentArrears: "Yes" (case-insensitive)
    return claimGroundSummaries.some(ground => ground?.value?.isRentArrears?.toUpperCase() === 'YES');
  }

  // Fallback for legacy case data shape used by existing seeded e2e fixtures.
  const introductoryGrounds = (validatedCase?.data?.introGrounds_IntroductoryDemotedOrOtherGrounds ?? []).map(ground =>
    String(ground).toUpperCase()
  );
  if (introductoryGrounds.includes('RENT_ARREARS')) {
    return true;
  }

  const welshDiscretionaryGrounds = (validatedCase?.data?.secureGroundsWales_DiscretionaryGrounds ?? []).map(ground =>
    String(ground).toUpperCase()
  );
  return welshDiscretionaryGrounds.some(ground => ground.includes('RENT_ARREARS'));
};
