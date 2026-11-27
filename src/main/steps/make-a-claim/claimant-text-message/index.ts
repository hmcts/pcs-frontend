import type { Request } from 'express';

import { hasPhoneNumber } from '../conditions';
import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-text-message',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('contactByText', {
      subFields: {
        yes: {
          textMessageNumber: textField('textMessageNumber', {
            required: (_formData, _allData, req) => !req || !hasPhoneNumber(req),
            maxLength: FIELD_LIMITS.textMessageNumber,
            errorMessage: 'errors.textMessageNumber',
            classes: 'govuk-input--width-20',
            attributes: { autocomplete: 'tel', type: 'tel' },
          }),
        },
      },
    }),
  ],
  extendGetContent: (req: Request) => (hasPhoneNumber(req) ? {} : { context: 'noPhone' }),
});
