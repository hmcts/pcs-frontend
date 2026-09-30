import type { Request } from 'express';

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
