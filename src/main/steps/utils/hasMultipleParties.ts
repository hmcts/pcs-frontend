import type { Request } from 'express';

export const hasMultipleParties = (req: Request): boolean => {
  const response = req.res?.locals?.validatedCase?.data?.possessionClaimResponse;
  const claimParties = response?.claimParties ?? [];
  const currentDefendantPartyId = response?.currentDefendantPartyId;

  const namedOtherParties = claimParties.filter(party => {
    const isNamed = Boolean(party.value?.firstName || party.value?.lastName || party.value?.orgName);
    const isCurrentDefendant = currentDefendantPartyId ? party.id === currentDefendantPartyId : false;
    return isNamed && !isCurrentDefendant;
  });

  return namedOtherParties.length >= 2;
};
