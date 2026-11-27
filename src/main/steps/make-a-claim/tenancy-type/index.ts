import { TENANCY_TYPES } from '../claimMapping';
import { radioQuestion, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'tenancy-type',
  stepDir: __dirname,
  fields: [
    radioQuestion('tenancyType', TENANCY_TYPES, {
      subFields: {
        OTHER: {
          otherTenancyTypeDetails: textField('otherTenancyTypeDetails', {
            maxLength: FIELD_LIMITS.otherTenancyTypeDetails,
            errorMessage: 'errors.otherTenancyTypeDetails',
          }),
        },
      },
    }),
  ],
});
