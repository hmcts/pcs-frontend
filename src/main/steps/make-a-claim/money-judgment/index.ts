import { yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'money-judgment',
  stepDir: __dirname,
  fields: [yesNoQuestion('moneyJudgmentWanted')],
});
