import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'gas-safety-available',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('hasGasSafetyReport', {
      subFields: {
        no: {
          noGasSafetyReportReason: longTextField('noGasSafetyReportReason', {
            required: true,
            maxLength: FIELD_LIMITS.noTenancyAgreementReason,
            errorMessage: 'errors.noGasSafetyReportReason',
          }),
        },
      },
    }),
  ],
});
