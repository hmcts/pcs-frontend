import { yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'general-application',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('generalApplicationIntent', { isPageHeading: false, legendClasses: 'govuk-fieldset__legend--m' }),
  ],
});
