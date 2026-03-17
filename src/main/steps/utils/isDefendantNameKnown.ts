import type { Request } from 'express';

/**
 * Checks if defendant name is known from CCD case data.
 *
 * Uses real CCD callback data path:
 * possessionClaimResponse.defendantContactDetails.party.nameKnown
 *
 * A defendant name is considered "known" when nameKnown flag is explicitly "YES"
 *
 * Real data examples:
 * - Known: { nameKnown: "YES", firstName: "ARUN", lastName: "KUMAR" }
 * - Unknown: { nameKnown: "NO" } (no firstName/lastName fields)
 */
export const isDefendantNameKnown = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const party = caseData?.possessionClaimResponse?.defendantContactDetails?.party;

  return party?.nameKnown === 'YES';
};
