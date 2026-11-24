import type { Request } from 'express';
import { DateTime } from 'luxon';

import { readClaim } from './claimDraft';
import { flowConfig } from './flow.config';
import { type RentSchedule, formatPence, rentPeriodEnd, rentTableWithArrears } from './rentHistory';

import { getRequestLanguage } from '@modules/i18n';
import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import { toDateLocale } from '@utils/formatLocalisedDate';

function actionLink(href: string, text: string, hidden: string): string {
  return `<a class="govuk-link" href="${href}">${text}<span class="govuk-visually-hidden"> ${hidden}</span></a>`;
}

function formatIso(isoDate: string | undefined, format: string, req: Request): string {
  const date = isoDate ? DateTime.fromISO(isoDate, { zone: 'utc' }) : undefined;
  return date?.isValid ? date.setLocale(toDateLocale(getRequestLanguage(req))).toFormat(format) : '';
}

/** A rent period's name in the statement: its month for monthly rent, otherwise the dates it runs between. */
function periodName(periodStart: string | undefined, schedule: RentSchedule, req: Request): string {
  if (schedule.rentFrequency === 'MONTHLY') {
    return formatIso(periodStart, 'MMMM yyyy', req);
  }
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  return t('makeAClaim:rentTable.periodRange', {
    start: formatIso(periodStart, 'd MMM', req),
    end: formatIso(rentPeriodEnd(periodStart, schedule), 'd MMM yyyy', req),
  });
}

export function rentStatementTable(req: Request, withActions: boolean): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const paymentUrl = getStepUrl('rent-statement-payment', flowConfig, req.res?.locals.validatedCase?.id);
  const rentArrears = readClaim(req).rentArrears;
  const schedule: RentSchedule = { rentFrequency: rentArrears?.rentFrequency, rentDueDay: rentArrears?.rentDueDay };
  const lines = rentTableWithArrears(rentArrears?.rentHistoryTable);
  const numeric = (date: string | undefined) => formatIso(date, 'd/M/yyyy', req);
  return {
    caption: t('makeAClaim:rentTable.caption'),
    captionClasses: 'govuk-visually-hidden',
    firstCellIsHeader: true,
    classes: 'govuk-table--small-text-until-tablet',
    head: [
      { text: t('makeAClaim:rentTable.period') },
      { text: t('makeAClaim:rentTable.dateDue') },
      { text: t('makeAClaim:rentTable.amountDue'), format: 'numeric' },
      { text: t('makeAClaim:rentTable.datePaid') },
      { text: t('makeAClaim:rentTable.amountPaid'), format: 'numeric' },
      { text: t('makeAClaim:rentTable.arrears'), format: 'numeric' },
      ...(withActions
        ? [{ html: `<span class="govuk-visually-hidden">${t('makeAClaim:rentTable.actions')}</span>` }]
        : []),
    ],
    rows: lines.map(line => {
      const period = periodName(line.periodStart, schedule, req);
      const actions = [
        ...(line.amountPaid !== undefined
          ? [
              actionLink(
                `${paymentUrl}?row=${line.rowIndex}`,
                t('makeAClaim:rentTable.change'),
                t('makeAClaim:rentTable.paymentPaidOn', { period, datePaid: numeric(line.datePaid) })
              ),
            ]
          : []),
        ...(!line.isAdditionalPayment
          ? [
              actionLink(
                `${paymentUrl}?period=${line.periodStart}`,
                t('makeAClaim:rentTable.addPayment'),
                t('makeAClaim:rentTable.paymentIn', { period })
              ),
            ]
          : []),
      ];
      return [
        line.isAdditionalPayment ? { html: `<span class="govuk-visually-hidden">${period}</span>` } : { text: period },
        { text: line.isAdditionalPayment ? '' : numeric(line.dateDue ?? line.periodStart) },
        { text: line.amountDue !== undefined ? formatPence(line.amountDue) : '', format: 'numeric' },
        { text: line.datePaid ? numeric(line.datePaid) : '–' },
        { text: line.amountPaid !== undefined ? formatPence(line.amountPaid) : '–', format: 'numeric' },
        { text: formatPence(line.arrears), format: 'numeric' },
        ...(withActions ? [{ html: actions.join('<br>') }] : []),
      ];
    }),
  };
}
