import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'payment-interstitial',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    flowConfig,
    customTemplate: `${__dirname}/paymentInterstitial.njk`,
    translationKeys: {
      heading: 'heading',
      caption: 'caption',
      paragraph1: 'paragraph1',
      paragraph2: 'paragraph2',
      paragraph3: 'paragraph3',
      paragraph4: 'paragraph4',
      bullet1: 'bullet1',
      bullet2: 'bullet2',
    },
    fields: [],
  }
);
