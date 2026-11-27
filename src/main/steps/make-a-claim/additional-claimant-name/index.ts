import { createAdditionalClaimantStep } from '../additionalClaimantStep';
import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createAdditionalClaimantStep({
  stepName: 'additional-claimant-name',
  stepDir: __dirname,
  fields: [
    textField('firstName', {
      maxLength: FIELD_LIMITS.claimantFirstName,
      attributes: { spellcheck: false },
    }),
    textField('lastName', {
      maxLength: FIELD_LIMITS.claimantLastName,
      attributes: { spellcheck: false },
      validator: (value: unknown, formData?: Record<string, unknown>): boolean | string =>
        `${String(formData?.firstName ?? '').trim()} ${String(value ?? '').trim()}`.length > FIELD_LIMITS.claimantName
          ? 'errors.nameTooLong'
          : true,
    }),
  ],
  previous: () => 'additional-claimant-type',
  next: () => 'additional-claimant-address',
});
