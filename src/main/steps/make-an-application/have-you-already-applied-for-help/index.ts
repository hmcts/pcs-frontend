import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'have-you-already-applied-for-help',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/haveYouAlreadyAppliedForHelp.njk`,
  fields: [
    {
      name: 'alreadyAppliedForHelp',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'YES',
          translationKey: 'options.yes',
          subFields: {
            hwfReference: {
              name: 'hwfReference',
              type: 'text',
              required: true,
              labelClasses: 'govuk-!-font-weight-bold',
              translationKey: {
                label: 'labels.hwfReference',
              }
            },
          },
        },
        {
          value: 'NO',
          translationKey: 'options.no'
        }
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
});
