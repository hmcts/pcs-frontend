import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'other-reasons',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('hasOtherReasons', {
      subFields: {
        yes: {
          otherReasonsDetail: longTextField('otherReasonsDetail', {
            required: true,
            maxLength: FIELD_LIMITS.otherReasonsDetail,
            errorMessage: 'errors.otherReasonsDetail',
          }),
        },
      },
    }),
  ],
});
