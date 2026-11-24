import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'eicr-available',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('hasElectricalInstallationConditionReport', {
      subFields: {
        no: {
          noElectricalInstallationConditionReason: longTextField('noElectricalInstallationConditionReason', {
            required: true,
            maxLength: FIELD_LIMITS.noTenancyAgreementReason,
            errorMessage: 'errors.noElectricalInstallationConditionReason',
          }),
        },
      },
    }),
  ],
});
