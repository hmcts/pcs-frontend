import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'upload-docs',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/uploadDocs.njk`,
});
