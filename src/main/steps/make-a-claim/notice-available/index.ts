import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'notice-available',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('noticeAvailable', {
      subFields: {
        no: {
          noticeUnavailableReason: longTextField('noticeUnavailableReason', {
            required: true,
            maxLength: FIELD_LIMITS.noticeUnavailableReason,
            errorMessage: 'errors.noticeUnavailableReason',
          }),
        },
      },
    }),
  ],
});
