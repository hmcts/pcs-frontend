import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'equality-and-diversity-end',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/equalityAndDiversityEnd.njk`,
});
