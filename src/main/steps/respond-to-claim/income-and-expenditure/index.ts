import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'income-and-expenditure',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/incomeAndExpenditure.njk`,
});
