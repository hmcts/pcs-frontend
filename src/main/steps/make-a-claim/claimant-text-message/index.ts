import { textField, yesNoQuestion } from '../fieldBuilders';
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
            maxLength: 20,
            classes: 'govuk-input--width-20',
            attributes: { autocomplete: 'tel', type: 'tel' },
          }),
        },
      },
    }),
  ],
});
