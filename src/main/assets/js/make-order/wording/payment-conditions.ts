import { type InlineBuilder, type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { type PaymentTerm, addPaymentTerm, money, partyLabels, value, values } from './common';

/**
 * The condition a suspension is on: the rent as it falls due plus the arrears, paid by a one-off payment,
 * instalments or both, then which debt payments go to first. A suspended possession order and a suspended
 * enforcement ask it with the same questions, whose ids start with the prefix, as do the clauses and facts it adds.
 */
export function addPaymentConditions(
  list: OrderedListBuilder,
  data: OrderData,
  prefix: string,
  suspended: string,
  { fixedIntroduction = false } = {}
): void {
  const { claimant, defendant, defendantVerb } = partyLabels(data);
  const paymentTerms = values(data, `${prefix}-payment-terms`);
  // Existing drafts may have an arrears fact and inline payment terms. Give the new structure its own clause IDs.
  const clausePrefix = fixedIntroduction ? `${prefix}-rent` : prefix;
  const terms: Record<string, PaymentTerm> = {
    'one-off': {
      kind: 'one-off',
      lead: 'payment of £',
      afterAmount: ` to ${claimant}`,
      fields: { amount: `${prefix}-oneoff-amount`, date: `${prefix}-oneoff-date` },
      facts: `${clausePrefix}-one-off`,
    },
    instalments: {
      kind: 'instalments',
      lead: 'payments of £',
      afterAmount: ` to ${claimant}`,
      fields: {
        amount: `${prefix}-instalment-amount`,
        frequency: `${prefix}-instalment-frequency`,
        date: `${prefix}-instalment-date`,
      },
      facts: `${clausePrefix}-instalment`,
    },
  };
  const condition = (content: InlineBuilder, ending: string): void => {
    content
      .text(
        `${suspended} ${defendant} ${defendantVerb('pays', 'pay')} (i) the rent as it falls due plus (ii) the arrears of £`
      )
      .fact(`${prefix}-arrears`, money(value(data, `${prefix}-arrears`)), { sourceId: `${prefix}-arrears` })
      .text(ending);
  };

  if (!fixedIntroduction && paymentTerms.length === 1) {
    list.item(`${clausePrefix}-condition`, content => {
      condition(content, ' by ');
      addPaymentTerm(content, data, terms[paymentTerms[0]]);
      content.text('.');
    });
  } else {
    list.item(
      `${clausePrefix}-condition`,
      fixedIntroduction ? suspended : content => condition(content, ' by:'),
      item => {
        item.orderedList(`${clausePrefix}-payment-terms`, subList => {
          for (const key of ['one-off', 'instalments'].filter(term => paymentTerms.includes(term))) {
            subList.item(`${clausePrefix}-${key}`, content => {
              addPaymentTerm(content, data, terms[key]);
              content.text(';');
            });
          }
          if (!paymentTerms.length) {
            subList.item(`${clausePrefix}-missing-payment-term`, content => {
              content.fact('missing', '[select a payment term]', { sourceId: `${prefix}-payment-terms` }).text(';');
            });
          }
        });
      }
    );
  }

  if (!fixedIntroduction) {
    list.item(
      `${prefix}-payment-priority`,
      `Payment of the above instalments made to ${claimant} shall be applied first to any arrears prior to any order for costs.`
    );
  }
}
