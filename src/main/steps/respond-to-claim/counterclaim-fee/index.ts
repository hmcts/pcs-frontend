import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counterclaim-fee',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterclaimFee.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  fields: [],
});
