import { type InlineBuilder, buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  type PaymentTerm,
  SAME_TERMS_COSTS,
  addCosts,
  addPaymentTerm,
  addPreamble,
  caseManCosts,
  date,
  hasCosts,
  joinList,
  money,
  partyLabels,
  selected,
  sentenceCase,
  value,
  values,
} from './common';

export function buildSuspendedOrder(data: OrderData): ReturnType<typeof buildOrder> {
  const address = data.propertyAddress || '[property address not provided]';
  const { claimant, defendant, defendantVerb } = partyLabels(data);
  const options = values(data, 'suspended-options');
  const paymentTerms = values(data, 'suspended-payment-terms');
  const costs = caseManCosts(claimant, defendant);
  const terms: Record<string, PaymentTerm> = {
    'one-off': {
      kind: 'one-off',
      lead: 'payment of £',
      afterAmount: ` to ${claimant}`,
      fields: { amount: 'suspended-oneoff-amount', date: 'suspended-oneoff-date' },
      facts: 'suspended-one-off',
    },
    instalments: {
      kind: 'instalments',
      lead: 'payments of £',
      afterAmount: ` to ${claimant}`,
      fields: {
        amount: 'suspended-instalment-amount',
        frequency: 'suspended-instalment-frequency',
        date: 'suspended-instalment-date',
      },
      facts: 'suspended-instalment',
    },
  };

  return buildOrder(order => {
    addPreamble(order, data);
    order.orderedList('suspended-clauses', list => {
      list.item('suspended-possession', content => {
        content
          .text(`${sentenceCase(defendant)} must give up possession of `)
          .fact('suspended-address', address)
          .text(` to ${claimant} on or before `)
          .fact('suspended-deadline', date(data, 'suspended-by-date'), { sourceId: 'suspended-by-date' })
          .text('.');
      });

      if (options.includes('money-claim-adjourned')) {
        list.item('suspended-money-claim-adjourned', 'The money claim is adjourned generally with liberty to restore.');
      } else if (options.includes('money-judgment-arrears')) {
        list.item('suspended-money-judgment', content => {
          content
            .text('Judgment for the claimant in the sum of £')
            .fact('suspended-money-judgment-amount', money(value(data, 'suspended-arrears')), {
              sourceId: 'suspended-arrears',
            })
            .text('.');
        });
      }

      if (hasCosts(data, costs)) {
        list.item('suspended-costs', content => addCosts(content, data, costs));
      }

      if (options.includes('use-occupation')) {
        list.item('suspended-use-occupation', content => {
          content
            .text(`${sentenceCase(defendant)} must pay to ${claimant} £`)
            .fact('suspended-use-occupation-rate', money(value(data, 'suspended-use-occupation-rate')), {
              sourceId: 'suspended-use-occupation-rate',
            })
            .text(' per day for damages for unlawful occupation from ')
            .fact('suspended-use-occupation-date', date(data, 'suspended-use-occupation-from-date'), {
              sourceId: 'suspended-use-occupation-from-date',
            })
            .text(` until possession of the property is given to ${claimant}.`);
        });
      }

      const suspended = ['Execution of the order for possession'];
      if (options.includes('money-judgment-arrears') && selected(data, 'suspended-mj-same-terms', 'yes')) {
        suspended.push('enforcement of the money judgment');
      }
      if (selected(data, 'costs', 'yes') && SAME_TERMS_COSTS.has(value(data, 'costs-choice'))) {
        suspended.push('enforcement of any order for costs');
      }
      const condition = (content: InlineBuilder, ending: string): void => {
        content
          .text(
            `${joinList(suspended)} ${suspended.length === 1 ? 'is' : 'are'} suspended as long as ${defendant} ${defendantVerb('pays', 'pay')} (i) the rent as it falls due plus (ii) the arrears of £`
          )
          .fact('suspended-arrears', money(value(data, 'suspended-arrears')), { sourceId: 'suspended-arrears' })
          .text(ending);
      };

      if (paymentTerms.length === 1) {
        list.item('suspended-condition', content => {
          condition(content, ' by ');
          addPaymentTerm(content, data, terms[paymentTerms[0]]);
          content.text('.');
        });
      } else {
        list.item(
          'suspended-condition',
          content => condition(content, ' by:'),
          item => {
            item.orderedList('suspended-payment-terms', subList => {
              for (const key of ['one-off', 'instalments'].filter(term => paymentTerms.includes(term))) {
                subList.item(`suspended-${key === 'one-off' ? 'one-off' : 'instalments'}`, content => {
                  addPaymentTerm(content, data, terms[key]);
                  content.text(';');
                });
              }
              if (!paymentTerms.length) {
                subList.item('suspended-missing-payment-term', '[select a payment term];');
              }
            });
          }
        );
      }

      list.item(
        'suspended-payment-priority',
        `Payment of the above instalments made to ${claimant} shall be applied first to any arrears prior to any order for costs.`
      );
      list.item(
        'suspended-paid-in-full',
        'This order shall not be enforceable once the total of the sums awarded above have been paid.'
      );
      if (options.includes('warrant-on-notice')) {
        list.item(
          'suspended-warrant-on-notice',
          'Any application for a warrant of possession must be heard on notice to all parties unless the court orders otherwise.'
        );
      }
      if (options.includes('transfer-high-court')) {
        list.item(
          'suspended-high-court-transfer',
          'The order for possession is transferred to the High Court solely for the purpose of enforcement.'
        );
      }
    });
  });
}
