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
  // Your Support is an optional task, so both "Save and continue" and "Save for later" return the
  // citizen to wherever they launched it from (task list or dashboard). There is nothing further to
  // save here: the flags were persisted by the callback before this page was shown.
  resolveRedirectAfterPost: async req => getYourSupportReturnUrl(req),
  resolveSaveForLaterRedirect: async req => getYourSupportReturnUrl(req),
});
