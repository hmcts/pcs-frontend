import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'equality-and-diversity-end',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/equalityAndDiversityEnd.njk`,
});
