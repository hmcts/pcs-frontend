import { readClaim } from '../claimDraft';
import { rentStatementPeriodOf } from '../claimMapping';
import { formatClaimDate } from '../dates';
import { dateField, moneyField } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { indexFromQuery } from '../formValues';
import { formatPence } from '../rentHistory';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-statement-payment',
  stepDir: __dirname,
  fields: [dateField('datePaid'), moneyField('amountPaid')],
  extendGetContent: req => {
    const claim = readClaim(req);
    const rows = claim.rentArrears?.rentHistoryTable ?? [];
    const row = rows[indexFromQuery(req.query?.row) ?? -1]?.value;
    const periodStart = row?.periodStart ?? rentStatementPeriodOf(req, claim);
    const period = rows.find(
      candidate => candidate.value.periodStart === periodStart && candidate.value.amountDue
    )?.value;
    return {
      periodDue: period ? formatClaimDate(period.dateDue, req) : '',
      periodAmount: period ? formatPence(period.amountDue) : '',
    };
  },
  resolveRedirectAfterPost: async req => getStepUrl('rent-statement', flowConfig, req.res?.locals.validatedCase?.id),
});
