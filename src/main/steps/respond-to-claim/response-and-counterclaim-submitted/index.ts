import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'response-and-counterclaim-submitted',
  stepDir: __dirname,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  customTemplate: `${__dirname}/responseAndCounterclaimSubmitted.njk`,
});
