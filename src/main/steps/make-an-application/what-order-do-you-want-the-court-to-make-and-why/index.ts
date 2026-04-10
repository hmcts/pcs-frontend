import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'what-order-do-you-want-the-court-to-make-and-why',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/whatOrderDoYouWant.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
});
