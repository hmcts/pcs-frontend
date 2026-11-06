import { LANGUAGES } from '../claimMapping';
import { radioQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'language-used',
  stepDir: __dirname,
  fields: [radioQuestion('languageUsed', LANGUAGES)],
});
