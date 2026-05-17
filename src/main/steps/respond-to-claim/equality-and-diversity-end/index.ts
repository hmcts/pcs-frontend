import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'equality-and-diversity-end',
  kind: 'interstitial',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/equalityAndDiversityEnd.njk`,
});
