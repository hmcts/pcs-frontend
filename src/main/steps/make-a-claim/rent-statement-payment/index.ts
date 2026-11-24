import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import { PERIOD_NOT_FOUND, paymentDueDateLimitOf, rentPaymentPeriodOf, rentStatementRowOf } from '../claimMapping';
import { formatClaimDate } from '../dates';
import { dateField, moneyField, yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { dateFromBody } from '../formValues';
import { formatPence } from '../rentHistory';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const REMOVE_PAYMENT = 'removePayment';

const rentStatementUrl = (req: Request) => getStepUrl('rent-statement', flowConfig, req.res?.locals.validatedCase?.id);

/** Whether the page changes a payment already on the statement (?row=), rather than adding one (?period=). */
const isChange = (req?: Request): boolean => req !== undefined && rentStatementRowOf(req, readClaim(req)) !== undefined;

const removing = (formData: Record<string, unknown>, req?: Request): boolean =>
  isChange(req) && (formData[REMOVE_PAYMENT] ?? req?.body?.[REMOVE_PAYMENT]) === 'yes';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-statement-payment',
  stepDir: __dirname,
  fields: [
    dateField('datePaid', {
      required: (formData, _allData, req) => !removing(formData, req),
      validate: (_value, formData, _allData, req) => {
        if (removing(formData, req)) {
          return undefined;
        }
        const datePaid = dateFromBody(formData, 'datePaid');
        const dateDue = req ? paymentDueDateLimitOf(req, readClaim(req)) : undefined;
        return req && datePaid && dateDue && datePaid < dateDue
          ? getTranslationFunction(req)('errors.beforeDateDue', { dateDue: formatClaimDate(dateDue, req) })
          : undefined;
      },
    }),
    moneyField('amountPaid', { required: (formData, _allData, req) => !removing(formData, req) }),
    yesNoQuestion(REMOVE_PAYMENT, {
      required: (_formData, _allData, req) => isChange(req),
      isPageHeading: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: `labels.${REMOVE_PAYMENT}` },
    }),
  ],
  redirectWhen: req =>
    rentPaymentPeriodOf(req, readClaim(req)) ? undefined : `${rentStatementUrl(req)}?problem=${PERIOD_NOT_FOUND}`,
  extendGetContent: (req, formContent) => {
    const t = getTranslationFunction(req);
    const period = rentPaymentPeriodOf(req, readClaim(req));
    const periodDue = period ? formatClaimDate(period.dateDue, req) : '';
    const periodAmount = period ? formatPence(period.amountDue) : '';
    const change = isChange(req);
    return {
      periodDue,
      periodAmount,
      paragraphs: t('paragraphs', { returnObjects: true, periodDue, periodAmount }),
      backUrl: rentStatementUrl(req),
      ...(change ? { pageTitle: t('changePageTitle'), heading: t('changeHeading') } : {}),
      ...(formContent.fields?.length && !change
        ? { fields: formContent.fields.filter(field => field.name !== REMOVE_PAYMENT) }
        : {}),
    };
  },
  resolveRedirectAfterPost: async req => rentStatementUrl(req),
});
