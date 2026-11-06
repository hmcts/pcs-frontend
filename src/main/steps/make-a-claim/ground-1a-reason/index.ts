import { pageHeadingLongText } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'ground-1a-reason',
  stepDir: __dirname,
  fields: [pageHeadingLongText('ground1AReason', { required: true })],
});
