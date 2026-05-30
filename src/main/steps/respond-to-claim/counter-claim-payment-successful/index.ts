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
    paymentReferenceLabel: 'paymentReferenceLabel',
    paymentReferencePlaceholder: 'paymentReferencePlaceholder',
    paragraph2: 'paragraph2',
    stubParagraph: 'stubParagraph',
  },
  extendGetContent: req => {
    const t = getTranslationFunction(req);
    const paymentReference = req.session.payment?.paymentReference || t('paymentReferencePlaceholder');

    return {
      paymentReference,
    };
  },
});
