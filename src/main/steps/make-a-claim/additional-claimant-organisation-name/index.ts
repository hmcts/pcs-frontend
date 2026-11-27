import { createAdditionalClaimantStep } from '../additionalClaimantStep';
import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createAdditionalClaimantStep({
  stepName: 'additional-claimant-organisation-name',
  stepDir: __dirname,
  fields: [textField('organisationName', { maxLength: FIELD_LIMITS.organisationName })],
  previous: () => 'additional-claimant-type',
  next: () => 'additional-claimant-address',
});
