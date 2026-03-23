import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'alternative-accommodation',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/alternativeAccommodation.njk`,
  translationKeys: {
    caption: 'caption',
    question: 'question',
  },
  fields: [
    {
      name: 'confirmAlternativeAccommodation',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--l',
      errorMessage: 'errors.confirmAlternativeAccommodation',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            alternativeAccommodationDate: {
              name: 'alternativeAccommodationDate',
              type: 'date',
              required: false,
              legendClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'dateLabel',
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'notSure', translationKey: 'options.notSure' },
      ],
    },
  ],
});
