import { createAdditionalClaimantStep } from '../additionalClaimantStep';
import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createAdditionalClaimantStep({
  stepName: 'additional-claimant-text-message',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('contactByText', {
      subFields: {
        yes: {
          textMessageNumber: textField('textMessageNumber', {
            maxLength: FIELD_LIMITS.textMessageNumber,
            errorMessage: 'errors.textMessageNumber',
            classes: 'govuk-input--width-20',
            attributes: { autocomplete: 'tel', type: 'tel' },
          }),
        },
      },
    }),
  ],
  previous: () => 'additional-claimant-phone',
  next: () => 'multiple-claimants',
});
