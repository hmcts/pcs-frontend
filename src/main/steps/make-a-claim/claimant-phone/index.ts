import { textField, yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const UK_PHONE = /^(?:\+44\s?|0)(?:\d\s?){9,10}$/;

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-phone',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('contactByPhone', {
      subFields: {
        yes: {
          phoneNumber: textField('phoneNumber', {
            maxLength: 20,
            errorMessage: 'errors.phoneNumber',
            classes: 'govuk-input--width-20',
            attributes: { autocomplete: 'tel', type: 'tel' },
            validator: (value: unknown): boolean | string =>
              typeof value === 'string' && value.trim() && !UK_PHONE.test(value.trim())
                ? 'errors.phoneNumberInvalid'
                : true,
          }),
        },
      },
    }),
  ],
});
