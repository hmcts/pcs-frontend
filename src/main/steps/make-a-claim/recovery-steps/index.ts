import { pageHeadingLongText } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'recovery-steps',
  stepDir: __dirname,
  fields: [pageHeadingLongText('recoverySteps', { maxLength: FIELD_LIMITS.recoverySteps })],
});
