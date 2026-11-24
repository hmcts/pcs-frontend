import { pageHeadingLongText } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'excluded-reason',
  stepDir: __dirname,
  fields: [pageHeadingLongText('excludedReason', { required: true, maxLength: FIELD_LIMITS.groundReason })],
});
