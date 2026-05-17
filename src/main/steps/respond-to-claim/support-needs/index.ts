import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'support-needs',
  stepDir: __dirname,
  customTemplate: `${__dirname}/supportNeeds.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    paragraph1: 'paragraph1',
  },
  fields: [],
});
