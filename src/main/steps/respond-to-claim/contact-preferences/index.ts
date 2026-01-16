import { isMobilePhone } from 'validator';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,

  translationKeys: {
    pageTitle: 'pageTitle',
    content: 'subtitle',
  },
  fields: [
    {
      name: 'contactByTextMessage',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'labels.question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'labels.options.yes',

          subFields: {
            phoneNumber: {
              name: 'phoneNumber',
              type: 'text',
              required: true,
              translationKey: {
                label: 'labels.phoneNumberLabel',
              },
              attributes: {
                type: 'tel',
                autocomplete: 'tel',
              },
              validator: value => isMobilePhone(value as string, ['en-GB']),
              errorMessage: 'errors.invalid',
            },
          },
        },
        {
          value: 'no',
          translationKey: 'labels.options.no',
        },
      ],
    },
  ],
});
