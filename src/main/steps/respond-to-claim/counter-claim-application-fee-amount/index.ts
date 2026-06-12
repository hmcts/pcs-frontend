import { penceToPounds } from '../../utils';
import { getCounterClaimAmountInPence } from '../../utils/counterClaimAmount';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';
import { getPaymentSessionState, setPaymentSessionState } from '@services/paymentSessionService';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-application-fee-amount',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/counterClaimApplicationFeeAmount.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    counterClaimAmountLabel: 'counterClaimAmountLabel',
    counterClaimFeeLabel: 'counterClaimFeeLabel',
    payNowButton: 'payNowButton',
    paymentHint: 'paymentHint',
    paymentError: 'paymentError',
  },
  extendGetContent: async req => {
    const paymentSession = getPaymentSessionState(req);
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;

    if (!counterClaim?.claimType) {
      throw new Error('Counterclaim fee unavailable: missing claimType');
    }

    const claimAmountInPence = paymentSession?.counterClaimAmountInPence ?? getCounterClaimAmountInPence(counterClaim);

    const feeType = getCounterClaimFeeType(counterClaim.claimType, claimAmountInPence);
    const feeAmount = await getFee(feeType, claimAmountInPence);

    if (paymentSession) {
      setPaymentSessionState(req, {
        ...paymentSession,
        feeAmount,
        counterClaimAmountInPence: claimAmountInPence,
      });
    }

    const t = getTranslationFunction(req);
    const counterClaimAmountPounds = claimAmountInPence ? penceToPounds(claimAmountInPence) : undefined;
    const counterClaimAmount = counterClaimAmountPounds === undefined ? undefined : Number(counterClaimAmountPounds);
    const caseReference = req.params.caseReference;
    const serviceRequestReference = paymentSession?.serviceRequestReference;
    const payNowUrl = caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-payment/start` : '#';
    const payNowDisabled = !serviceRequestReference;
    const paymentQuery = req.query?.payment;
    const showPaymentError = paymentQuery === 'failed' || paymentQuery === 'pending';

    return {
      formattedCounterClaimAmount:
        counterClaimAmount === undefined ? undefined : t('counterClaimAmountDisplay', { counterClaimAmount }),
      formattedCounterClaimFee: t('counterClaimFeeDisplay', { counterClaimFee: feeAmount }),
      payNowButton: t('payNowButton', { counterClaimFee: feeAmount }),
      payNowUrl,
      payNowDisabled,
      showPaymentError,
    };
  },
});
