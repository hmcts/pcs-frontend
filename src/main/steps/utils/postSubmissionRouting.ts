import type { CcdCaseData } from '@services/ccdCase.interface';

function getDefendantResponses(caseData: CcdCaseData | undefined) {
  return caseData?.possessionClaimResponse?.defendantResponses;
}
//  Response submitted (no counterclaim).
export function shouldShowResponseSubmittedConfirmationStep(caseData: CcdCaseData | undefined): boolean {
  const makeCounterClaim = getDefendantResponses(caseData)?.makeCounterClaim;
  
  return makeCounterClaim === 'NO' || makeCounterClaim === undefined;
}

//  Response and counterclaim submitted (with Help With Fees reference).
export function shouldShowResponseAndCounterClaimSubmittedConfirmationStep(caseData: CcdCaseData | undefined): boolean {
  const defendantResponses = getDefendantResponses(caseData);
  if (defendantResponses?.makeCounterClaim !== 'YES') {
    return false;
  }
  return Boolean(defendantResponses.counterClaim?.hwfReferenceNumber?.trim());
}

//  Response submitted with counterclaim, but fee payment needed (no Help With Fees reference).
export function shouldShowCounterClaimFeePaymentNeededConfirmationStep(caseData: CcdCaseData | undefined): boolean {
  const defendantResponses = getDefendantResponses(caseData);
  if (defendantResponses?.makeCounterClaim !== 'YES') {
    return false;
  }
  return !defendantResponses.counterClaim?.hwfReferenceNumber?.trim();
}

// Final submit route handler function used to determine which confirmation page to show after response submission
export function getRespondToClaimConfirmationPath(caseId: string, caseData: CcdCaseData | undefined): string {
  const base = `/case/${caseId}/respond-to-claim`;

  if (shouldShowResponseSubmittedConfirmationStep(caseData)) {
    return `${base}/response-submitted`;
  }
  if (shouldShowResponseAndCounterClaimSubmittedConfirmationStep(caseData)) {
    return `${base}/response-and-counter-claim-submitted`;
  }
  return `${base}/response-submitted-counter-claim-fee-payment-needed`;
}
