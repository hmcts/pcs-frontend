import { textField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-due-day',
  stepDir: __dirname,
  fields: [
    textField('rentDueDay', {
      isPageHeading: true,
      maxLength: 2,
      classes: 'govuk-input--width-2',
      translationKey: { label: 'question', hint: 'hint' },
      attributes: { inputmode: 'numeric' },
      validator: (value: unknown): boolean | string => {
        const day = typeof value === 'string' ? value.trim() : '';
        return /^\d{1,2}$/.test(day) && Number(day) >= 1 && Number(day) <= 31 ? true : 'errors.rentDueDayInvalid';
      },
    }),
  ],
});
