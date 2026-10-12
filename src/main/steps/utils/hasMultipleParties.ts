import type { Request } from 'express';

/**
 * Returns true if at least one other party (claimant or defendant) exists on the claim
 * besides the current defendant, indicating an opposing party is available for selection.
 */
export const hasMultipleParties = (req: Request): boolean => {
  const data = req.res?.locals.validatedCase?.data;
  const currentDefendantPartyId = data?.possessionClaimResponse?.currentDefendantPartyId;

  const allParties = [...(data?.allClaimants ?? []), ...(data?.allDefendants ?? [])];

  const otherParties = allParties.filter(party => {
    const isCurrentDefendant = currentDefendantPartyId ? party.id === currentDefendantPartyId : false;
    return party.id && !isCurrentDefendant;
  });

  return otherParties.length >= 1;
};
