import { yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'underlessee',
  stepDir: __dirname,
  fields: [yesNoQuestion('underlesseeExists', { isPageHeading: false, legendClasses: 'govuk-fieldset__legend--m' })],
});
