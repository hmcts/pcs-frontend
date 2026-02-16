import type { Request } from 'express';

/**
 * Checks if defendant name is known from CCD case data.
 *
 * Uses real CCD callback data path:
 * possessionClaimResponse.defendantContactDetails.party
 *
 * A defendant name is considered "known" when:
 * 1. nameKnown flag is explicitly "YES"
 * 2. Both firstName AND lastName are present
 *
 * Real data examples:
 * - Known: { nameKnown: "YES", firstName: "ARUN", lastName: "KUMAR" }
 * - Unknown: { nameKnown: "NO" } (no firstName/lastName fields)
 */
export const isDefendantNameKnown = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const party = caseData?.possessionClaimResponse?.defendantContactDetails?.party;

  // Check both explicit flag AND field presence
  return party?.nameKnown === 'YES' && !!(party?.firstName && party?.lastName);
};
