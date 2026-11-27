import { type InlineBuilder, type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { type PaymentTerm, addPaymentTerm, money, partyLabels, value, values } from './common';

const TERM_ORDER = ['one-off', 'instalments'];

/** The one-off payment and instalments the judge chose, asked with ids that start with the prefix. */
function chosenTerms(data: OrderData, prefix: string): PaymentTerm[] {
  const { claimant } = partyLabels(data);
  const terms: Record<string, PaymentTerm> = {
    'one-off': {
      kind: 'one-off',
      lead: 'payment of £',
      afterAmount: ` to ${claimant}`,
      fields: { amount: `${prefix}-oneoff-amount`, date: `${prefix}-oneoff-date` },
      facts: `${prefix}-one-off`,
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
      facts: `${prefix}-instalment`,
    },
  };
  const chosen = values(data, `${prefix}-payment-terms`);
  return TERM_ORDER.filter(term => chosen.includes(term)).map(term => terms[term]);
}

/** A clause introducing the payments a suspension is conditional on, then each payment as a sub-item. */
export function addPaymentTermsList(
  list: OrderedListBuilder,
  data: OrderData,
  prefix: string,
  introduction: string | ((content: InlineBuilder) => void)
): void {
  const terms = chosenTerms(data, prefix);
  list.item(`${prefix}-condition`, introduction, item => {
    item.orderedList(`${prefix}-payment-terms`, subList => {
      for (const term of terms) {
        subList.item(`${prefix}-${term.kind}`, content => {
          addPaymentTerm(content, data, term);
          content.text(';');
        });
      }
      if (!terms.length) {
        subList.item(`${prefix}-missing-payment-term`, content => {
          content.fact('missing', '[select a payment term]', { sourceId: `${prefix}-payment-terms` }).text(';');
        });
      }
    });
  });
}

/**
 * The condition enforcement is suspended on: the rent as it falls due plus the arrears, paid by a one-off payment,
 * instalments or both, then which debt payments go to first. The clauses and facts it adds, and the questions it
 * reads, have ids that start with the prefix.
 */
export function addPaymentConditions(
  list: OrderedListBuilder,
  data: OrderData,
  prefix: string,
  suspended: string
): void {
  const { claimant, defendant, defendantVerb } = partyLabels(data);
  const terms = chosenTerms(data, prefix);
  const condition = (content: InlineBuilder, ending: string): void => {
    content
      .text(
        `${suspended} ${defendant} ${defendantVerb('pays', 'pay')} (i) the rent as it falls due plus (ii) the arrears of £`
      )
      .fact(`${prefix}-arrears`, money(value(data, `${prefix}-arrears`)), { sourceId: `${prefix}-arrears` })
      .text(ending);
  };

  if (terms.length === 1) {
    list.item(`${prefix}-condition`, content => {
      condition(content, ' by ');
      addPaymentTerm(content, data, terms[0]);
      content.text('.');
    });
  } else {
    addPaymentTermsList(list, data, prefix, content => condition(content, ' by:'));
  }
  list.item(
    `${prefix}-payment-priority`,
    `Payment of the above instalments made to ${claimant} shall be applied first to any arrears prior to any order for costs.`
  );
}
