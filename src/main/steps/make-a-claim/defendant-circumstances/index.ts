import { pageHeadingLongText } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'defendant-circumstances',
  stepDir: __dirname,
  fields: [pageHeadingLongText('defendantCircumstances')],
});
