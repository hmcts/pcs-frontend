import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import { PERIOD_NOT_FOUND, paymentDueDateLimitOf, rentPaymentPeriodOf } from '../claimMapping';
import { formatClaimDate } from '../dates';
import { dateField, moneyField } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { dateFromBody } from '../formValues';
import { formatPence } from '../rentHistory';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const rentStatementUrl = (req: Request) => getStepUrl('rent-statement', flowConfig, req.res?.locals.validatedCase?.id);

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-statement-payment',
  stepDir: __dirname,
  fields: [
    dateField('datePaid', {
      validate: (_value, formData, _allData, req) => {
        const datePaid = dateFromBody(formData, 'datePaid');
        const dateDue = req ? paymentDueDateLimitOf(req, readClaim(req)) : undefined;
        return req && datePaid && dateDue && datePaid < dateDue
          ? getTranslationFunction(req)('errors.beforeDateDue', { dateDue: formatClaimDate(dateDue, req) })
          : undefined;
      },
    }),
    moneyField('amountPaid'),
  ],
  redirectWhen: req =>
    rentPaymentPeriodOf(req, readClaim(req)) ? undefined : `${rentStatementUrl(req)}?problem=${PERIOD_NOT_FOUND}`,
  extendGetContent: req => {
    const period = rentPaymentPeriodOf(req, readClaim(req));
    const periodDue = period ? formatClaimDate(period.dateDue, req) : '';
    const periodAmount = period ? formatPence(period.amountDue) : '';
    return {
      periodDue,
      periodAmount,
      paragraphs: getTranslationFunction(req)('paragraphs', { returnObjects: true, periodDue, periodAmount }),
      backUrl: rentStatementUrl(req),
    };
  },
  resolveRedirectAfterPost: async req => rentStatementUrl(req),
});
