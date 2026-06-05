import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'response-submitted-counter-claim-fee-payment-needed',
  stepDir: __dirname,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    responseSubmittedCounterClaimFeePaymentNeededParagraph1: 'responseSubmittedCounterClaimFeePaymentNeededParagraph1',
    responseSubmittedCounterClaimFeePaymentNeededHeading1: 'responseSubmittedCounterClaimFeePaymentNeededHeading1',
    responseSubmittedCounterClaimFeePaymentNeededListItem1: 'responseSubmittedCounterClaimFeePaymentNeededListItem1',
    responseSubmittedCounterClaimFeePaymentNeededListItem2: 'responseSubmittedCounterClaimFeePaymentNeededListItem2',
    responseSubmittedCounterClaimFeePaymentNeededListItem3: 'responseSubmittedCounterClaimFeePaymentNeededListItem3',
    responseSubmittedCounterClaimFeePaymentNeededHeading2: 'responseSubmittedCounterClaimFeePaymentNeededHeading2',
    responseSubmittedCounterClaimFeePaymentNeededParagraph2: 'responseSubmittedCounterClaimFeePaymentNeededParagraph2',
    closeAndReturnToCaseOverview: 'closeAndReturnToCaseOverview',
  },
  extendGetContent: req => {
    const caseReference = req.params.caseReference;
    const counterClaimApplicationFeeAmountUrl = caseReference
      ? `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount`
      : '#';
    const t = getTranslationFunction(req);

    return {
      responseSubmittedCounterClaimFeePaymentNeededListItem1: t(
        'responseSubmittedCounterClaimFeePaymentNeededListItem1',
        {
          counterClaimApplicationFeeAmountUrl,
        }
      ),
    };
  },
  customTemplate: `${__dirname}/responseSubmittedCounterClaimFeePaymentNeeded.njk`,
  extendGetContent: () => ({
    backUrl: '',
  }),
});
