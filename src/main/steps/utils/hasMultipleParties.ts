import type { Request } from 'express';

export const hasMultipleParties = (req: Request): boolean => {
  const data = req.res?.locals.validatedCase?.data;
  const currentDefendantPartyId = data?.possessionClaimResponse?.currentDefendantPartyId;

  const allParties = [...(data?.allClaimants ?? []), ...(data?.allDefendants ?? [])];

  const namedOtherParties = allParties.filter(party => {
    const isNamed = Boolean(party.value?.firstName || party.value?.lastName || party.value?.orgName);
    const isCurrentDefendant = currentDefendantPartyId ? party.id === currentDefendantPartyId : false;
    return isNamed && !isCurrentDefendant;
  });

  return namedOtherParties.length >= 2;
};
