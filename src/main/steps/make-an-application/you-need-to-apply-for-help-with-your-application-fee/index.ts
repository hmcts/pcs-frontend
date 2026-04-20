import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'you-need-to-apply-for-help-with-your-application-fee',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/youNeedToApplyForHelpWithYourApplicationFee.njk`,
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
