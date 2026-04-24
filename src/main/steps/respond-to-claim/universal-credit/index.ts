import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'have-you-applied-for-universal-credit',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/universalCredit.njk`,
});
