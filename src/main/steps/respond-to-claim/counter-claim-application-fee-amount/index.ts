import type { Request } from 'express';

import { penceToPounds } from '../../utils';
import { getCounterClaimAmountInPence } from '../../utils/counterClaimAmount';
import { isRelease12Enabled } from '../../utils/isRelease12Enabled';
import { createRespondToClaimFormStep } from '../formStep';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';
import {
  type PaymentSessionState,
  getPaymentSessionState,
  persistPaymentSessionState,
  setPaymentSessionState,
} from '@services/paymentSessionService';
import { paymentService } from '@services/pcsApi/paymentService';

const logger = Logger.getLogger('counterClaimApplicationFeeAmount');

function toFeeAmountNumber(feeAmount: unknown): number | undefined {
  if (typeof feeAmount === 'number' && !Number.isNaN(feeAmount)) {
    return feeAmount;
  }
  if (typeof feeAmount === 'string' && feeAmount.trim() !== '') {
    const parsed = Number(feeAmount);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

async function rehydratePaymentSessionIfNeeded(
  req: Request,
  caseReference: string | undefined,
  claimType: string | undefined,
  claimAmountInPence: string | undefined
): Promise<PaymentSessionState | undefined> {
  const paymentSession = getPaymentSessionState(req);
  if (paymentSession?.serviceRequestReference && paymentSession.feeAmount !== undefined) {
    return paymentSession;
  }

  if (!isRelease12Enabled(req)) {
    return paymentSession;
  }

  const accessToken = req.session?.user?.accessToken;
  if (!accessToken || !caseReference) {
    return paymentSession;
  }

  try {
    const outstanding = await paymentService.getOutstandingCounterClaimPayment(accessToken, caseReference);
    const feeAmount = toFeeAmountNumber(outstanding.feeAmount);
    if (!outstanding.serviceRequestReference || feeAmount === undefined) {
      return paymentSession;
    }

    const rehydratedSession: PaymentSessionState = {
      ...paymentSession,
      caseReference,
      serviceRequestReference: outstanding.serviceRequestReference,
      feeAmount,
      counterClaimAmountInPence: claimAmountInPence ?? paymentSession?.counterClaimAmountInPence,
      counterClaimType: claimType ?? paymentSession?.counterClaimType,
    };
    await persistPaymentSessionState(req, rehydratedSession);
    return rehydratedSession;
  } catch (error) {
    logger.warn(`Unable to rehydrate outstanding counterclaim payment for case ${caseReference}: ${String(error)}`);
    return paymentSession;
  }
}

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-application-fee-amount',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/counterClaimApplicationFeeAmount.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    notApplicable: 'notApplicable',
    counterClaimAmountLabel: 'counterClaimAmountLabel',
    counterClaimFeeLabel: 'counterClaimFeeLabel',
    payNowButton: 'payNowButton',
    paymentError: 'paymentError',
  },
  extendGetContent: async req => {
    const caseModel = req.res?.locals?.validatedCase;
    const counterClaim = caseModel instanceof CcdCaseModel ? caseModel.defendantResponsesCounterClaim : undefined;
    const caseReferenceParam = req.params?.caseReference;
    const caseReference = Array.isArray(caseReferenceParam) ? caseReferenceParam[0] : caseReferenceParam;
    const fromDashboard = req.query?.from === 'dashboard';

    let paymentSession = getPaymentSessionState(req);
    const claimType = paymentSession?.counterClaimType ?? counterClaim?.claimType;
    const claimAmountInPence = paymentSession?.counterClaimAmountInPence ?? getCounterClaimAmountInPence(counterClaim);

    paymentSession = await rehydratePaymentSessionIfNeeded(req, caseReference, claimType, claimAmountInPence);

    let feeAmount = paymentSession?.feeAmount;
    if (feeAmount === undefined) {
      if (!claimType) {
        throw new Error('Counterclaim fee unavailable: missing claimType');
      }
      const feeType = getCounterClaimFeeType(claimType, claimAmountInPence);
      feeAmount = await getFee(feeType, claimAmountInPence);
    }

    if (paymentSession) {
      setPaymentSessionState(req, {
        ...paymentSession,
        feeAmount,
        counterClaimAmountInPence: claimAmountInPence,
        counterClaimType: claimType,
      });
      paymentSession = getPaymentSessionState(req);
    }

    const t = getTranslationFunction(req);
    const counterClaimAmountPounds = claimAmountInPence ? penceToPounds(claimAmountInPence) : undefined;
    const counterClaimAmount = counterClaimAmountPounds === undefined ? undefined : Number(counterClaimAmountPounds);
    const serviceRequestReference = paymentSession?.serviceRequestReference;
    const payNowUrl = caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-payment/start` : '#';
    const payNowDisabled = !serviceRequestReference;
    const paymentQuery = req.query?.payment;
    const showPaymentError = paymentQuery === 'failed' || paymentQuery === 'pending';

    const confirmationBackUrl = caseReference
      ? `/case/${caseReference}/respond-to-claim/response-submitted-counter-claim-fee-payment-needed`
      : '';
    const backUrl = fromDashboard ? (getDashboardUrl(caseReference) ?? confirmationBackUrl) : confirmationBackUrl;

    return {
      formattedCounterClaimAmount:
        counterClaimAmount === undefined ? undefined : t('counterClaimAmountDisplay', { counterClaimAmount }),
      formattedCounterClaimFee: t('counterClaimFeeDisplay', { counterClaimFee: feeAmount }),
      payNowButton: t('payNowButton', { counterClaimFee: feeAmount }),
      payNowUrl,
      payNowDisabled,
      showPaymentError,
      backUrl,
    };
  },
});
