import { longTextField, yesNoQuestion } from '../fieldBuilders';
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
            errorMessage: 'errors.otherReasonsDetail',
          }),
        },
      },
    }),
  ],
});
