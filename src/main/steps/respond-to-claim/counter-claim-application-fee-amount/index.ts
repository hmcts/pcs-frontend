import { penceToPounds } from '../../utils';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';

function formatPounds(amount: number | string | undefined): string | undefined {
  if (amount === undefined || amount === null || amount === '') {
    return undefined;
  }

  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(numericAmount)) {
    return undefined;
  }

  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

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
    paymentStubParagraph: 'paymentStubParagraph',
    paymentStubHint: 'paymentStubHint',
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
    const formattedCounterClaimAmount = formatPounds(penceToPounds(claimAmountInPence));
    const formattedCounterClaimFee = formatPounds(counterClaimFee) ?? '0.00';

    return {
      counterClaimAmount: formattedCounterClaimAmount,
      counterClaimFee: formattedCounterClaimFee,
      payNowButton: t('payNowButton', { counterClaimFee: formattedCounterClaimFee }),
    };
  },
});
