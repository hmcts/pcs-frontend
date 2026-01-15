import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'interstitial',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,

  translationKeys: {
    pageTitle: 'pageTitle',
    content: 'subtitle',
  },
  fields: [],
});
