import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'payment-interstitial',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/paymentInterstitial.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
    bullet1: 'bullet1',
    bullet2: 'bullet2',
  },
  fields: [],
});
