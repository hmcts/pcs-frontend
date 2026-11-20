import { moneyField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-amount',
  stepDir: __dirname,
  fields: [moneyField('rentAmount', { isPageHeading: true, translationKey: { label: 'question', hint: 'hint' } })],
});
