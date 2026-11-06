import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-name',
  stepDir: __dirname,
  fields: [
    textField('firstName', {
      maxLength: FIELD_LIMITS.claimantFirstName,
      attributes: { autocomplete: 'given-name', spellcheck: false },
    }),
    textField('lastName', {
      maxLength: FIELD_LIMITS.claimantLastName,
      attributes: { autocomplete: 'family-name', spellcheck: false },
    }),
  ],
});
