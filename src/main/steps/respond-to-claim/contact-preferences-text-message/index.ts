import { isMobilePhone } from 'validator';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-text-message',
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
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            phoneNumber: {
              name: 'phoneNumber',
              type: 'text',
              required: true,
              translationKey: {
                label: 'phoneNumberLabel',
              },
              attributes: {
                type: 'tel',
                autocomplete: 'tel',
              },
              validator: (value: unknown) => {
                if (!isMobilePhone(value as string, 'en-GB')) {
                  return 'errors.contactByTextMessage.phoneNumber.invalid';
                }
                return true;
              },
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
});
