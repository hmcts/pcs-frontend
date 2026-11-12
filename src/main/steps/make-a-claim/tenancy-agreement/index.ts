import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'tenancy-agreement',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('tenancyAgreementAvailable', {
      subFields: {
        no: {
          noTenancyAgreementReason: longTextField('noTenancyAgreementReason', {
            required: true,
            maxLength: FIELD_LIMITS.noTenancyAgreementReason,
            errorMessage: 'errors.noTenancyAgreementReason',
          }),
        },
      },
    }),
  ],
});
