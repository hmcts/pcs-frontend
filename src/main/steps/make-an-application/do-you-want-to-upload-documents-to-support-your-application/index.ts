import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'do-you-want-to-upload-documents-to-support-your-application',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/doYouWantToUploadDocuments.njk`,
  fields: [
    {
      name: 'uploadDocuments',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'YES',
          translationKey: 'options.yes',
        },
        {
          value: 'NO',
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
