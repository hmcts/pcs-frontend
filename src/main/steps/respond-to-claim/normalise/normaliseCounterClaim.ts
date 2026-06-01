import { normalizeYesNoValue } from '../../utils';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseCounterClaim(response: PossessionClaimResponse): void {
  const dr = response.defendantResponses;
  if (!dr) {
    return;
  }

  // No counterclaim → all downstream counter-claim screens (including upload) are skipped
  if (normalizeYesNoValue(dr.makeCounterClaim) !== 'YES') {
    delete dr.counterClaim;
    delete dr.counterClaimWantToUploadFiles;
    delete dr.counterClaimDocuments;
    return;
  }

  // User said they don't want to upload files → any previously uploaded doc metadata is stale
  if (normalizeYesNoValue(dr.counterClaimWantToUploadFiles) !== 'YES') {
    delete dr.counterClaimDocuments;
  }

  const cc = dr.counterClaim;
  if (!cc) {
    return;
  }

  // HWF not applied for → reference number is stale
  if (cc.appliedForHwf !== 'YES') {
    delete cc.hwfReferenceNumber;
  }

  // needHelpWithFees not YES → "have you applied" + reference are stale
  if (normalizeYesNoValue(cc.needHelpWithFees) !== 'YES') {
    delete cc.appliedForHwf;
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
  const amountKnown = normalizeYesNoValue(cc.isClaimAmountKnown);
  if (amountKnown === 'YES') {
    delete cc.estimatedMaxClaimAmount;
  } else if (amountKnown === 'NO') {
    delete cc.claimAmount;
  }
}
