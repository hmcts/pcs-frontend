import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'other-considerations',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/otherConsiderations.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  // Placeholder step: routing only for now.
  fields: [],
});
