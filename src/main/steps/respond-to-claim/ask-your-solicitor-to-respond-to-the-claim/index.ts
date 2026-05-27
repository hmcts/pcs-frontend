import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'ask-your-solicitor-to-respond-to-the-claim',
  stepDir: __dirname,
  customTemplate: `${__dirname}/askYourSolicitorToRespondToTheClaim.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph1: 'paragraph1',
    closeAndReturnToTaskList: 'closeAndReturnToTaskList',
  },
  fields: [],
});
