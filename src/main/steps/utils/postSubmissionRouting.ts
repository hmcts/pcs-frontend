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

export interface SubmitPaymentPayload {
  serviceRequestReference?: string;
  feeAmount?: number;
}

export interface RespondToClaimSubmitNavigation {
  confirmationPath: string;
  counterClaimFeePaymentRequired: boolean;
}

// Final submit route handler function used to determine which confirmation page to show after response submission
export function getRespondToClaimConfirmationPath(caseId: string, caseData: CcdCaseData | undefined): string {
  return getRespondToClaimSubmitNavigation(caseId, caseData).confirmationPath;
}

export function getRespondToClaimSubmitNavigation(
  caseId: string,
  caseData: CcdCaseData | undefined,
  paymentPayload?: SubmitPaymentPayload
): RespondToClaimSubmitNavigation {
  const base = `/case/${caseId}/respond-to-claim`;
  const paymentRequired = Boolean(paymentPayload?.serviceRequestReference?.trim());

  if (paymentRequired) {
    return {
      confirmationPath: `${base}/response-submitted-counter-claim-fee-payment-needed`,
      counterClaimFeePaymentRequired: true,
    };
  }

  if (shouldShowResponseSubmittedConfirmationStep(caseData)) {
    return {
      confirmationPath: `${base}/response-submitted`,
      counterClaimFeePaymentRequired: false,
    };
  }
  if (shouldShowResponseAndCounterClaimSubmittedConfirmationStep(caseData)) {
    return {
      confirmationPath: `${base}/response-and-counter-claim-submitted`,
      counterClaimFeePaymentRequired: false,
    };
  }
  return {
    confirmationPath: `${base}/response-submitted-counter-claim-fee-payment-needed`,
    counterClaimFeePaymentRequired: false,
  };
}
