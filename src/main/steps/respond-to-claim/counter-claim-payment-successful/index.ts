import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-payment-successful',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/counterClaimPaymentSuccessful.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    paragraph1: 'paragraph1',
    paymentReference: 'paymentReference',
    paragraph2: 'paragraph2',
    closeAndReturnToCaseOverview: 'closeAndReturnToCaseOverview',
  },
  extendGetContent: req => {
    const paymentReference = req.session.payment?.paymentReference;
    const t = getTranslationFunction(req);

    return {
      paymentReferenceLine: paymentReference ? t('paymentReference', { paymentReference }) : undefined,
    };
  },
});
