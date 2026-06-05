import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-payment-successful',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/counterClaimPaymentSuccessful.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    paragraph1: 'paragraph1',
    paymentReferenceLabel: 'paymentReferenceLabel',
    paymentReferencePlaceholder: 'paymentReferencePlaceholder',
    paragraph2: 'paragraph2',
  },
  extendGetContent: req => {
    const paymentReference = req.session.payment?.paymentReference;

    return {
      paymentReference,
    };
  },
});
