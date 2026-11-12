import { readClaim } from '../claimDraft';
import { rentChangeExceedsLimit } from '../claimMapping';
import { textField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';
import { MAX_RENT_PERIODS } from '../rentHistory';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const dayOf = (value: unknown): number | undefined => {
  const day = typeof value === 'string' ? value.trim() : '';
  return /^\d{1,2}$/.test(day) && Number(day) >= 1 && Number(day) <= 31 ? Number(day) : undefined;
};

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
      validator: (value: unknown): boolean | string => (dayOf(value) ? true : 'errors.rentDueDayInvalid'),
      validate: (value, _formData, _allData, req) => {
        const rentDueDay = dayOf(value);
        return req && rentDueDay && rentChangeExceedsLimit(readClaim(req), req, { rentDueDay })
          ? getTranslationFunction(req)('errors.tooManyPeriods', { limit: MAX_RENT_PERIODS })
          : undefined;
      },
    }),
  ],
});
