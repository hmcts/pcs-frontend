import { type DocBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { date, selectedControlId, value } from './common';

/**
 * The statements an order made on the court's own initiative, or without notice to a party, ends with, in the words
 * other civil orders use, each with the date the judge sets for applying to set it aside, vary or stay it.
 */
export const NOTICE_STATEMENTS: Record<string, { text: string; datePrefix: string }> = {
  'own-initiative': {
    text:
      "As this order was made on the court's own initiative, any party affected by the order may apply to set " +
      'aside, vary, or stay the order. Any such application must be made by 4pm on ',
    datePrefix: 'own-initiative-by',
  },
  'without-notice': {
    text:
      'If you were not notified of the application before this order was made, you may apply to set aside, vary, ' +
      'or stay the order. Any such application must be made by 4pm on ',
    datePrefix: 'without-notice-by',
  },
};

/** The statement the order ends with, if the judge said it was made on the court's own initiative or without notice. */
export function addNoticeStatement(order: DocBuilder, data: OrderData): void {
  const choice = value(data, 'order-notice');
  const statement = NOTICE_STATEMENTS[choice];
  if (!statement) {
    return;
  }
  order.paragraph(`${choice}-statement`, content => {
    content
      .fact('statement', statement.text, { sourceId: selectedControlId(data, 'order-notice') })
      .fact('date', date(data, statement.datePrefix), { sourceId: statement.datePrefix })
      .text('.');
  });
}
