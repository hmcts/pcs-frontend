import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

const stepName = 'defendant-date-of-birth';
export const step: StepDefinition = createFormStep({
  stepName,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  showCancelButton: false,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [
    {
      legendClasses: 'govuk-fieldset__legend--l govuk-!-margin-bottom-9',
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      noFutureDate: true,
      translationKey: {
        label: 'dateOfBirthLabel',
      },
    },
  ],
});
