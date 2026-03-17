import type { Request } from 'express';

/**
 * Checks if defendant name is known from CCD case data.
 *
 * Uses claimantEnteredDefendantDetails.nameKnown for routing decision:
 * - What the CLAIMANT entered when creating the claim
 * - Determines if we can show a name to the defendant for confirmation
 *
 * Architecture:
 * - claimantEnteredDefendantDetails = INPUT (what claimant knows)
 * - defendantContactDetails.party = OUTPUT (what defendant confirms/corrects)
 *
 * Real data examples:
 * - Known: { nameKnown: "YES", firstName: "ARUN", lastName: "KUMAR" }
 * - Unknown: { nameKnown: "NO" }
 */
export const isDefendantNameKnown = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;

  return claimantEntry?.nameKnown === 'YES';
};
