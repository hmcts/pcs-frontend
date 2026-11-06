import { NOTICE_TYPES } from '../claimMapping';
import { radioQuestion, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'notice-type',
  stepDir: __dirname,
  fields: [
    radioQuestion('noticeType', NOTICE_TYPES, {
      subFields: {
        OTHER: {
          noticeTypeOther: textField('noticeTypeOther', {
            maxLength: FIELD_LIMITS.noticeTypeOther,
            errorMessage: 'errors.noticeTypeOther',
          }),
        },
      },
    }),
  ],
});
