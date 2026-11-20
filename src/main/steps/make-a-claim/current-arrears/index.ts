import { moneyField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'current-arrears',
  stepDir: __dirname,
  fields: [moneyField('currentArrears', { isPageHeading: true, translationKey: { label: 'question', hint: 'hint' } })],
});
