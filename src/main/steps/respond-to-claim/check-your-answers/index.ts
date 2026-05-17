import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'check-your-answers',
  kind: 'cya',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/checkYourAnswers.njk`,
});
