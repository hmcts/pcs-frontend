import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'organisation-name',
  stepDir: __dirname,
  fields: [
    textField('organisationName', {
      maxLength: FIELD_LIMITS.organisationName,
      attributes: { autocomplete: 'organization' },
    }),
  ],
});
