import { longTextField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'notice-served',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('noticeServed', {
      subFields: {
        no: {
          noNoticeReason: longTextField('noNoticeReason', {
            required: true,
            maxLength: FIELD_LIMITS.noNoticeReason,
            errorMessage: 'errors.noNoticeReason',
          }),
        },
      },
    }),
  ],
});
