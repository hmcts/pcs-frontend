import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/repayments.njk`,
});

