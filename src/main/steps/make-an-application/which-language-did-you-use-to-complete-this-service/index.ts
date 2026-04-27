import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'which-language-did-you-use-to-complete-this-service',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/whichLanguage.njk`,
  fields: [
    {
      name: 'whichLanguage',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      errorMessage: 'errors.confirmLanguage',
      options: [
        {
          value: 'ENGLISH',
          translationKey: 'options.ENGLISH',
        },
        {
          value: 'WELSH',
          translationKey: 'options.WELSH',
        },
        {
          value: 'ENGLISH_AND_WELSH',
          translationKey: 'options.ENGLISH_AND_WELSH',
        },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    ifSomeoneElseHelpedYou: 'ifSomeoneElseHelpedYou',
  },
});
