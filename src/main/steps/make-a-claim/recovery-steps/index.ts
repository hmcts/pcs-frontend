import { pageHeadingLongText } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'recovery-steps',
  stepDir: __dirname,
  fields: [pageHeadingLongText('recoverySteps')],
});
