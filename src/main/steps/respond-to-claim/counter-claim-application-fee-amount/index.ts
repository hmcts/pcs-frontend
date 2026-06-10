import { penceToPounds } from '../../utils';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';

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
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
    if (!counterClaim?.claimType) {
      throw new Error('Counterclaim application fee unavailable: missing claimType');
    }

    let claimAmountInPence: string | undefined;
    if (counterClaim.isClaimAmountKnown === 'YES') {
      claimAmountInPence = counterClaim.claimAmount;
    } else if (counterClaim.isClaimAmountKnown === 'NO') {
      claimAmountInPence = counterClaim.estimatedMaxClaimAmount;
    }
    const feeType = getCounterClaimFeeType(counterClaim.claimType, claimAmountInPence);
    const counterClaimFee = await getFee(feeType, claimAmountInPence);

    const t = getTranslationFunction(req);
    const counterClaimAmountPounds = claimAmountInPence ? penceToPounds(claimAmountInPence) : undefined;
    const counterClaimAmount = counterClaimAmountPounds !== undefined ? Number(counterClaimAmountPounds) : undefined;
    const caseReference = req.params.caseReference;
    const serviceRequestReference = req.session.payment?.serviceRequestReference;
    const payNowUrl = caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-payment/start` : '#';
    const payNowDisabled = !serviceRequestReference;
    const paymentQuery = req.query?.payment;
    const showPaymentError = paymentQuery === 'failed' || paymentQuery === 'pending';

    return {
      formattedCounterClaimAmount:
        counterClaimAmount !== undefined ? t('counterClaimAmountDisplay', { counterClaimAmount }) : undefined,
      formattedCounterClaimFee: t('counterClaimFeeDisplay', { counterClaimFee }),
      payNowButton: t('payNowButton', { counterClaimFee }),
      payNowUrl,
      payNowDisabled,
      showPaymentError,
    };
  },
});
