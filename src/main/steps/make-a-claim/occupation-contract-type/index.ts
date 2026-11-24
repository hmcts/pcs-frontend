import { OCCUPATION_CONTRACT_TYPES } from '../claimMapping';
import { radioQuestion, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'occupation-contract-type',
  stepDir: __dirname,
  fields: [
    radioQuestion('occupationContractType', OCCUPATION_CONTRACT_TYPES, {
      subFields: {
        OTHER: {
          otherOccupationContractDetails: textField('otherOccupationContractDetails', {
            maxLength: FIELD_LIMITS.otherOccupationContractDetails,
            errorMessage: 'errors.otherOccupationContractDetails',
          }),
        },
      },
    }),
  ],
});
