import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'epc-available',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('hasEnergyPerformanceCertificate', {
      subFields: {
        no: {
          noEnergyPerformanceCertificateReason: longTextField('noEnergyPerformanceCertificateReason', {
            required: true,
            maxLength: FIELD_LIMITS.noTenancyAgreementReason,
            errorMessage: 'errors.noEnergyPerformanceCertificateReason',
          }),
        },
      },
    }),
  ],
});
