import { yesNoWithReason } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'notice-served',
  stepDir: __dirname,
  fields: [yesNoWithReason('noticeServed', 'noNoticeReason', FIELD_LIMITS.noNoticeReason)],
});
