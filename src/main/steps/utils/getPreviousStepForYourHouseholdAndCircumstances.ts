import type { Request } from 'express';

import { isRentArrearsClaim } from './isRentArrearsClaim';
import { normalizeYesNoValue } from './normalizeYesNoValue';

import type { YesNoNotSureValue, YesNoValue } from '@services/ccdCase.interface';

type PaymentAgreementShape = {
  repaymentPlanAgreed?: YesNoNotSureValue;
  repayArrearsInstalments?: YesNoValue;
  additionalRentContribution?: unknown;
  additionalContributionFrequency?: string;
};

function getPaymentAgreementFromCase(req: Request): PaymentAgreementShape | undefined {
  const pcr = req.res?.locals?.validatedCase?.data?.possessionClaimResponse as
    | {
        defendantResponses?: { paymentAgreement?: PaymentAgreementShape };
        paymentAgreement?: PaymentAgreementShape;
      }
    | undefined;

  return pcr?.defendantResponses?.paymentAgreement ?? pcr?.paymentAgreement;
}

function hasInstalmentAmountOrFrequency(paymentAgreement: PaymentAgreementShape | undefined): boolean {
  if (!paymentAgreement) {
    return false;
  }

  const freq = paymentAgreement.additionalContributionFrequency;
  if (typeof freq === 'string' && freq.trim()) {
    return true;
  }

  const contrib = paymentAgreement.additionalRentContribution;
  if (contrib === undefined || contrib === null) {
    return false;
  }

  if (typeof contrib === 'number') {
    return Number.isFinite(contrib);
  }

  if (typeof contrib === 'string' && contrib.trim()) {
    return true;
  }

  if (typeof contrib === 'object') {
    const amount = (contrib as { amount?: unknown }).amount;
    return typeof amount === 'number' && Number.isFinite(amount);
  }

  return false;
}

export async function getPreviousStepForYourHouseholdAndCircumstances(req: Request): Promise<string> {
  const paymentAgreement = getPaymentAgreementFromCase(req);
  const repaymentPlanAgreed = paymentAgreement?.repaymentPlanAgreed;

  if (repaymentPlanAgreed === undefined || repaymentPlanAgreed === null) {
    return 'repayments-agreed';
  }

  if (repaymentPlanAgreed !== 'NO') {
    return 'repayments-agreed';
  }

  const rentArrearsClaim = await isRentArrearsClaim(req);
  if (!rentArrearsClaim) {
    return 'repayments-agreed';
  }

  const instalOffer = normalizeYesNoValue(paymentAgreement?.repayArrearsInstalments);

  if (instalOffer === 'YES') {
    if (hasInstalmentAmountOrFrequency(paymentAgreement)) {
      return 'how-much-afford-to-pay';
    }
    return 'installment-payments';
  }

  if (instalOffer === 'NO') {
    return 'installment-payments';
  }

  return 'installment-payments';
}
