import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import {
  PERIOD_NOT_FOUND,
  paymentDateLimitsOf,
  rentPaymentPeriodOf,
  rentStatementPeriodOf,
  rentStatementRowOf,
} from '../claimMapping';
import { formatClaimDate } from '../dates';
import { dateField, moneyField, yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { dateFromBody } from '../formValues';
import { rentPeriodEnd } from '../rentHistory';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const REMOVE_PAYMENT = 'removePayment';
const ADD_ANOTHER = 'addAnotherPayment';

const paymentUrl = (req: Request) =>
  getStepUrl('rent-statement-payment', flowConfig, req.res?.locals.validatedCase?.id);

const rentStatementUrl = (req: Request) => getStepUrl('rent-statement', flowConfig, req.res?.locals.validatedCase?.id);

/** Whether the page changes a payment already on the statement (?row=), rather than adding one (?period=). */
const isChange = (req?: Request): boolean => req !== undefined && rentStatementRowOf(req, readClaim(req)) !== undefined;

const removing = (formData: Record<string, unknown>, req?: Request): boolean =>
  isChange(req) && (formData[REMOVE_PAYMENT] ?? req?.body?.[REMOVE_PAYMENT]) === 'yes';

function periodDates(req: Request): { periodStart: string; periodEnd: string } {
  const claim = readClaim(req);
  const period = rentPaymentPeriodOf(req, claim);
  const end = rentPeriodEnd(period?.periodStart, claim.rentArrears ?? {});
  return { periodStart: formatClaimDate(period?.periodStart, req), periodEnd: formatClaimDate(end, req) };
}

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-statement-payment',
  stepDir: __dirname,
  fields: [
    dateField('datePaid', {
      required: (formData, _allData, req) => !removing(formData, req),
      validate: (_value, formData, _allData, req) => {
        const datePaid = dateFromBody(formData, 'datePaid');
        if (!req || !datePaid || removing(formData, req)) {
          return undefined;
        }
        const t = getTranslationFunction(req);
        const { earliest, latest } = paymentDateLimitsOf(req, readClaim(req));
        if (earliest && datePaid < earliest) {
          return t('errors.beforeDateDue', { dateDue: formatClaimDate(earliest, req) });
        }
        if (latest && datePaid > latest) {
          return t('errors.afterPeriodEnd', { periodEnd: formatClaimDate(latest, req) });
        }
        return undefined;
      },
    }),
    moneyField('amountPaid', { required: (formData, _allData, req) => !removing(formData, req) }),
    yesNoQuestion(ADD_ANOTHER, {
      required: (_formData, _allData, req) => !isChange(req),
      isPageHeading: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: `labels.${ADD_ANOTHER}` },
    }),
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
    const dates = periodDates(req);
    const change = isChange(req);
    const heading = t(change ? 'changeHeading' : 'heading', dates);
    const notAsked = change ? ADD_ANOTHER : REMOVE_PAYMENT;
    return {
      ...dates,
      pageTitle: heading,
      heading,
      backUrl: rentStatementUrl(req),
      ...(formContent.fields?.length ? { fields: formContent.fields.filter(field => field.name !== notAsked) } : {}),
    };
  },
  resolveRedirectAfterPost: async req => {
    const periodStart = rentStatementPeriodOf(req, readClaim(req));
    return !isChange(req) && req.body?.[ADD_ANOTHER] === 'yes' && periodStart
      ? `${paymentUrl(req)}?period=${periodStart}`
      : rentStatementUrl(req);
  },
});
