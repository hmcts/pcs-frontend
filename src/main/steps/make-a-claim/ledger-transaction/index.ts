import { dateField, moneyField, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'ledger-transaction',
  stepDir: __dirname,
  fields: [
    dateField('transactionDate'),
    {
      name: 'transactionTypes',
      type: 'checkbox',
      required: true,
      legendClasses: 'govuk-fieldset__legend--s',
      translationKey: { label: 'labels.transactionTypes', hint: 'hints.transactionTypes' },
      options: [
        {
          value: 'RENT_CHARGE',
          translationKey: 'options.RENT_CHARGE',
          subFields: { amountCharged: moneyField('amountCharged', { errorMessage: 'errors.amountCharged' }) },
        },
        {
          value: 'TENANT_PAYMENT',
          translationKey: 'options.TENANT_PAYMENT',
          subFields: { amountPaid: moneyField('amountPaid', { errorMessage: 'errors.amountPaid' }) },
        },
      ],
    },
    textField('description', { required: false, maxLength: FIELD_LIMITS.ledgerDescription }),
  ],
  resolveRedirectAfterPost: async req => getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id),
});
