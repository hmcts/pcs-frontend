import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseCounterClaim(response: PossessionClaimResponse): void {
  const dr = response.defendantResponses;
  if (!dr) {
    return;
  }

  // No counterclaim → all downstream counter-claim screens are skipped
  if (dr.makeCounterClaim !== 'YES') {
    delete dr.counterClaim;
    return;
  }

  const cc = dr.counterClaim;
  if (!cc) {
    return;
  }

  // HWF not applied for → reference number is stale
  if (cc.appliedForHwf !== 'YES') {
    delete cc.hwfReferenceNumber;
  }

  // Counterclaim isn't a money/payment claim → counter-claim-specific-sum is skipped
  if (cc.claimType !== 'PAYMENT_OR_COMPENSATION' && cc.claimType !== 'BOTH') {
    delete cc.isClaimAmountKnown;
    delete cc.claimAmount;
    delete cc.estimatedMaxClaimAmount;
    return;
  }

  // Specific amount known → estimate is stale; not known → exact amount is stale
  if (cc.isClaimAmountKnown === 'YES') {
    delete cc.estimatedMaxClaimAmount;
  } else if (cc.isClaimAmountKnown === 'NO') {
    delete cc.claimAmount;
  }
}
