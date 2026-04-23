import { createRespondToClaimFormStep } from '../formStep';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'priority-debt-details',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/priorityDebtDetails.njk`,
});
