import { yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'excluded-grounds-claim',
  stepDir: __dirname,
  // The page's H1 is "Grounds for possession", above its paragraphs, so the question is the radios' own legend.
  fields: [yesNoQuestion('hasExcludedGrounds', { isPageHeading: false, legendClasses: 'govuk-fieldset__legend--m' })],
});
