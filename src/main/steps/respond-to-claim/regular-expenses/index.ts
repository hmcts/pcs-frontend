import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'what-other-regular-expenses-do-you-have',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/regularExpenses.njk`,
});
