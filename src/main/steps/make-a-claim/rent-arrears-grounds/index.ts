import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { RENT_ARREARS_GROUNDS } from '@services/citizenPossessionClaim.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-arrears-grounds',
  stepDir: __dirname,
  fields: [
    {
      name: 'rentArrearsGrounds',
      type: 'checkbox',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: { label: 'question', hint: 'hint' },
      options: RENT_ARREARS_GROUNDS.map(ground => ({ value: ground, translationKey: `makeAClaim:grounds.${ground}` })),
    },
  ],
});
