import type { Request } from 'express';

/**
 * Check if claimant knows the defendant's name.
 *
 * Returns true if claimant provided a name when creating the claim,
 * false if they didn't know it. Used to decide whether to show a
 * confirmation page or a capture page to the defendant.
 */
export const isDefendantNameKnown = (req: Request): boolean => {
  const { claimantEnteredDefendantDetailsNameKnown } = req.res?.locals?.validatedCase ?? {
    claimantEnteredDefendantDetailsNameKnown: '',
  };

  return claimantEnteredDefendantDetailsNameKnown === 'YES';
};
