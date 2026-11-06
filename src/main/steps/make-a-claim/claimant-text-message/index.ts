import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-text-message',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('contactByText', {
      subFields: {
        yes: {
          textMessageNumber: textField('textMessageNumber', {
            required: false,
            maxLength: FIELD_LIMITS.textMessageNumber,
            classes: 'govuk-input--width-20',
            attributes: { autocomplete: 'tel', type: 'tel' },
          }),
        },
      },
    }),
  ],
});
