import type { Request } from 'express';

/**
 * Check if claimant knows the defendant's name.
 *
 * Returns true if claimant provided a name when creating the claim,
 * false if they didn't know it. Used to decide whether to show a
 * confirmation page or a capture page to the defendant.
 */
export const isDefendantNameKnown = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;

  return claimantEntry?.nameKnown === 'YES';
};
