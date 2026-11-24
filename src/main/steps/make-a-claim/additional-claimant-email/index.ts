import { createAdditionalClaimantStep } from '../additionalClaimantStep';
import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { emailValidator } from '../formValues';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createAdditionalClaimantStep({
  stepName: 'additional-claimant-email',
  stepDir: __dirname,
  fields: [
    textField('emailAddress', {
      required: false,
      isPageHeading: true,
      translationKey: { label: 'question', hint: 'hint' },
      maxLength: FIELD_LIMITS.emailAddress,
      attributes: { spellcheck: false, type: 'email' },
      validator: emailValidator('errors.emailAddressInvalid'),
    }),
  ],
  previous: () => 'additional-claimant-address',
  next: () => 'additional-claimant-phone',
});
