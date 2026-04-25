import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'other-considerations',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/otherConsiderations.njk`,
});
