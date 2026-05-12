import { normalizeYesNoValue } from '../../utils';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseCounterClaim(response: PossessionClaimResponse): void {
  const dr = response.defendantResponses;
  if (!dr) {
    return;
  }

  // No counterclaim → all downstream counter-claim screens are skipped
  if (normalizeYesNoValue(dr.makeCounterClaim) !== 'YES') {
    delete dr.counterClaim;
    return;
  }

  const cc = dr.counterClaim;
  if (!cc) {
    return;
  }

  // Counterclaim isn't a money/payment claim → counter-claim-specific-sum is skipped
  if (cc.claimType !== 'PAYMENT_OR_COMPENSATION' && cc.claimType !== 'BOTH') {
    delete cc.isClaimAmountKnown;
    delete cc.claimAmount;
    delete cc.estimatedMaxClaimAmount;
    return;
  }

  // Specific amount known → estimate is stale; not known → exact amount is stale
  const amountKnown = normalizeYesNoValue(cc.isClaimAmountKnown);
  if (amountKnown === 'YES') {
    delete cc.estimatedMaxClaimAmount;
  } else if (amountKnown === 'NO') {
    delete cc.claimAmount;
  }
}
