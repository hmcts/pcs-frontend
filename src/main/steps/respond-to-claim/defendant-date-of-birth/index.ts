import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

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
      required: false,
      noFutureDate: true,
      translationKey: {
        label: 'dateOfBirthLabel',
      },
    },
  ],
});
