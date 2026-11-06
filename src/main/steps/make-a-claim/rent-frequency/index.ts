import { RENT_FREQUENCIES } from '../claimMapping';
import { radioQuestion, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-frequency',
  stepDir: __dirname,
  fields: [
    radioQuestion('rentFrequency', RENT_FREQUENCIES, {
      subFields: {
        OTHER: {
          otherFrequencyDetails: textField('otherFrequencyDetails', {
            maxLength: FIELD_LIMITS.otherFrequencyDetails,
            errorMessage: 'errors.otherFrequencyDetails',
          }),
        },
      },
    }),
  ],
});
