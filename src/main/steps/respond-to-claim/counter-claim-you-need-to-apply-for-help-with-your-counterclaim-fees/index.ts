import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counterclaim-you-need-to-apply-for-help-with-your-counterclaim-fees',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterclaimYouNeedToApplyForHelpWithYourCounterclaimFees.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    youNeedToApplyBeforeContinuing: 'youNeedToApplyBeforeContinuing',
    enterCourtFormNumber: 'enterCourtFormNumber',
    afterYouHaveApplied: 'afterYouHaveApplied',
    ifYouReceiveAnyBenefit: 'ifYouReceiveAnyBenefit',
    ifYouHaveYourHWFReference: 'ifYouHaveYourHWFReference',
  },
});
