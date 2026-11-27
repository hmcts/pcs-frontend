import { moneyField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'arrears-at-notice',
  stepDir: __dirname,
  fields: [
    moneyField('arrearsAtNoticeDate', { isPageHeading: true, translationKey: { label: 'question', hint: 'hint' } }),
  ],
});
