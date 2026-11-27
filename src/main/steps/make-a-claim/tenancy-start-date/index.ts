import { dateField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'tenancy-start-date',
  stepDir: __dirname,
  fields: [
    dateField('tenancyStartDate', {
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: { label: 'question', hint: 'hint' },
    }),
  ],
});
