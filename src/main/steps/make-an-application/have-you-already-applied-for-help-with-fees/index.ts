import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'have-you-already-applied-for-help-with-fees',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/haveYouAlreadyAppliedForHelp.njk`,
  fields: [
    {
      name: 'alreadyAppliedForHwf',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      errorMessage: 'errors.haveYouAlreadyApplied',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            hwfReference: {
              name: 'hwfReference',
              type: 'text',
              required: true,
              maxLength: 60,
              labelClasses: 'govuk-!-font-weight-bold',
              translationKey: {
                label: 'revealedHwfQuestion.label',
                hint: 'revealedHwfQuestion.hint',
              },
              errorMessage: 'errors.hwfReference',
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
});
