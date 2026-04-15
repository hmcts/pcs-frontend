import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

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
    paragraph1: 'paragraph1',
  },
});
