import { accountEmailOf } from '../claimMapping';
import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-email',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('useAccountEmail', {
      subFields: {
        no: {
          emailAddress: textField('emailAddress', {
            maxLength: FIELD_LIMITS.emailAddress,
            errorMessage: 'errors.emailAddress',
            attributes: { autocomplete: 'email', spellcheck: false, type: 'email' },
            validator: (value: unknown): boolean | string =>
              typeof value === 'string' && value.trim() && !EMAIL.test(value.trim())
                ? 'errors.emailAddressInvalid'
                : true,
          }),
        },
      },
    }),
  ],
  extendGetContent: req => ({ accountEmail: accountEmailOf(req) ?? '' }),
});
