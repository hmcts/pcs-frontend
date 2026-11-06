import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { readClaim } from './claimDraft';
import { formatClaimDate } from './dates';
import { flowConfig } from './flow.config';
import { formatPence, ledgerWithArrears, rentTableWithArrears } from './rentHistory';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';

function ledgerLink(href: string, text: string, entryIndex: number, t: TFunction): string {
  return `<a class="govuk-link" href="${href}">${text}<span class="govuk-visually-hidden"> ${t('makeAClaim:ledgerTable.transaction')} ${entryIndex + 1}</span></a>`;
}

export function ledgerTable(req: Request, withActions: boolean): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const transactionUrl = getStepUrl('ledger-transaction', flowConfig, req.res?.locals.validatedCase?.id);
  const removeUrl = getStepUrl('remove-ledger-entry', flowConfig, req.res?.locals.validatedCase?.id);
  const lines = ledgerWithArrears(readClaim(req).rentArrears?.rentHistoryLedger);
  return {
    caption: t('makeAClaim:ledgerTable.caption'),
    captionClasses: 'govuk-table__caption--m',
    classes: 'govuk-table--small-text-until-tablet',
    head: [
      { text: t('makeAClaim:ledgerTable.date') },
      { text: t('makeAClaim:ledgerTable.type') },
      { text: t('makeAClaim:ledgerTable.description') },
      { text: t('makeAClaim:ledgerTable.amountCharged'), format: 'numeric' },
      { text: t('makeAClaim:ledgerTable.amountPaid'), format: 'numeric' },
      { text: t('makeAClaim:ledgerTable.arrears'), format: 'numeric' },
      ...(withActions
        ? [{ html: `<span class="govuk-visually-hidden">${t('makeAClaim:ledgerTable.actions')}</span>` }]
        : []),
    ],
    rows: lines.map(line => [
      { text: formatClaimDate(line.transactionDate, req) },
      { text: line.transactionTypes.map(type => t(`makeAClaim:ledgerTable.types.${type}`)).join(', ') },
      { text: line.description ?? '' },
      { text: line.amountCharged !== undefined ? formatPence(line.amountCharged) : '', format: 'numeric' },
      { text: line.amountPaid !== undefined ? formatPence(line.amountPaid) : '', format: 'numeric' },
      { text: formatPence(line.arrears), format: 'numeric' },
      ...(withActions
        ? [
            {
              html: [
                ledgerLink(
                  `${transactionUrl}?entry=${line.entryIndex}`,
                  t('makeAClaim:ledgerTable.change'),
                  line.entryIndex,
                  t
                ),
                ledgerLink(
                  `${removeUrl}?entry=${line.entryIndex}`,
                  t('makeAClaim:ledgerTable.remove'),
                  line.entryIndex,
                  t
                ),
              ].join('<br>'),
            },
          ]
        : []),
    ]),
  };
}

export function rentStatementTable(req: Request, withActions: boolean): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const paymentUrl = getStepUrl('rent-statement-payment', flowConfig, req.res?.locals.validatedCase?.id);
  const lines = rentTableWithArrears(readClaim(req).rentArrears?.rentHistoryTable);
  const link = (href: string, text: string, hidden: string) =>
    `<a class="govuk-link" href="${href}">${text}<span class="govuk-visually-hidden"> ${hidden}</span></a>`;
  return {
    caption: t('makeAClaim:rentTable.caption'),
    captionClasses: 'govuk-visually-hidden',
    firstCellIsHeader: true,
    classes: 'govuk-table--small-text-until-tablet',
    head: [
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
      const due = formatClaimDate(line.dateDue ?? line.periodStart, req);
      const actions = [
        ...(line.amountPaid !== undefined
          ? [
              link(
                `${paymentUrl}?row=${line.rowIndex}`,
                t('makeAClaim:rentTable.change'),
                `${t('makeAClaim:rentTable.paymentFor')} ${due}`
              ),
            ]
          : []),
        ...(!line.isAdditionalPayment
          ? [
              link(
                `${paymentUrl}?period=${line.periodStart}`,
                t('makeAClaim:rentTable.addPayment'),
                `${t('makeAClaim:rentTable.paymentFor')} ${due}`
              ),
            ]
          : []),
      ];
      return [
        { text: line.isAdditionalPayment ? t('makeAClaim:rentTable.additionalPayment') : due },
        { text: line.amountDue !== undefined ? formatPence(line.amountDue) : '', format: 'numeric' },
        { text: line.datePaid ? formatClaimDate(line.datePaid, req) : '–' },
        { text: line.amountPaid !== undefined ? formatPence(line.amountPaid) : '–', format: 'numeric' },
        { text: formatPence(line.arrears), format: 'numeric' },
        ...(withActions ? [{ html: actions.join('<br>') }] : []),
      ];
    }),
  };
}
