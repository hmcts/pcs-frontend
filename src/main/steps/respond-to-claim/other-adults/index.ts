import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'other-adults',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/otherAdults.njk`,
  translationKeys: {
    question: 'question',
    caption: 'caption',
  },
  fields: [
    {
      name: 'confirmOtherAdults',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            otherAdultsInfo: {
              name: 'otherAdultsInfo',
              type: 'textarea',
              maxLength: 500,
              required: true,
              errorMessage: 'errors.otherAdultsInfo',
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
                hint: 'textAreaHintText',
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
