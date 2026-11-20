import { yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'other-grounds-claim',
  stepDir: __dirname,
  fields: [yesNoQuestion('hasOtherGrounds')],
});
