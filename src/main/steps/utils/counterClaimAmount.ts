export interface CounterClaimAmountSource {
  isClaimAmountKnown?: string;
  claimAmount?: string;
  estimatedMaxClaimAmount?: string;
}

export function getCounterClaimAmountInPence(counterClaim?: CounterClaimAmountSource): string | undefined {
  if (!counterClaim) {
    return undefined;
  }

  if (counterClaim.isClaimAmountKnown === 'YES') {
    return counterClaim.claimAmount;
  }

  if (counterClaim.isClaimAmountKnown === 'NO') {
    return counterClaim.estimatedMaxClaimAmount;
  }

  return undefined;
}
