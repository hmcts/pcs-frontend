import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'underlessee-name',
  stepDir: __dirname,
  fields: [textField('underlesseeName', { maxLength: FIELD_LIMITS.underlesseeName })],
});
