import { createRespondToClaimFormStep } from '../formStep';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'what-regular-income-do-you-receive',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/regularIncome.njk`,
});
