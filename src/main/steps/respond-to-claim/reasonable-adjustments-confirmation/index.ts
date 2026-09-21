import { createRespondToClaimFormStep } from '../formStep';
import { getYourSupportReturnUrl } from '../yourSupportSection';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'reasonable-adjustments-confirmation',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/reasonableAdjustmentsConfirmation.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    submittedCaption: 'submittedCaption',
    whatHappensNextHeading: 'whatHappensNextHeading',
    whatHappensNextParagraph1: 'whatHappensNextParagraph1',
    whatHappensNextParagraph2: 'whatHappensNextParagraph2',
  },
  // Your Support is an optional task, so "Save and continue" returns the citizen to wherever they
  // launched it from (task list or dashboard).
  resolveRedirectAfterPost: async req => getYourSupportReturnUrl(req),
});
