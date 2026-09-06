import { type InlineBuilder, buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  SAME_TERMS_COSTS,
  addCaseManCosts,
  addPreamble,
  date,
  hasCaseManCosts,
  joinList,
  money,
  partyLabels,
  selected,
  sentenceCase,
  value,
  values,
} from './common';

function addOneOffTerm(content: InlineBuilder, data: OrderData, claimant: string): void {
  content
    .text('payment of £')
    .fact('suspended-one-off-amount', money(value(data, 'suspended-oneoff-amount')), {
      sourceId: 'suspended-oneoff-amount',
    })
    .text(` to ${claimant} by `)
    .fact('suspended-one-off-date', date(data, 'suspended-oneoff-date'), {
      sourceId: 'suspended-oneoff-date',
    });
}

function addInstalmentTerm(content: InlineBuilder, data: OrderData, claimant: string): void {
  const frequency = value(data, 'suspended-instalment-frequency') === 'weekly' ? 'week' : 'month';
  content
    .text('payments of £')
    .fact('suspended-instalment-amount', money(value(data, 'suspended-instalment-amount')), {
      sourceId: 'suspended-instalment-amount',
    })
    .text(` to ${claimant} every `)
    .fact('suspended-instalment-frequency', frequency, { sourceId: 'suspended-instalment-frequency' })
    .text(', the first instalment to be paid on or before ')
    .fact('suspended-instalment-date', date(data, 'suspended-instalment-date'), {
      sourceId: 'suspended-instalment-date',
    });
}

export function buildSuspendedOrder(data: OrderData): ReturnType<typeof buildOrder> {
  const address = data.propertyAddress || '[property address not provided]';
  const { claimant, defendant, defendantVerb } = partyLabels(data);
  const options = values(data, 'suspended-options');
  const paymentTerms = values(data, 'suspended-payment-terms');
  const costsChoice = value(data, 'costs-choice');

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

      if (hasCaseManCosts(data)) {
        list.item('suspended-costs', content => addCaseManCosts(content, data, claimant, defendant));
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

      const suspendedSubjects = ['Execution of the order for possession'];
      if (options.includes('money-judgment-arrears') && selected(data, 'suspended-mj-same-terms', 'yes')) {
        suspendedSubjects.push('enforcement of the money judgment');
      }
      if (selected(data, 'costs', 'yes') && SAME_TERMS_COSTS.has(costsChoice)) {
        suspendedSubjects.push('enforcement of any order for costs');
      }
      const conditionStart = `${joinList(suspendedSubjects)} ${suspendedSubjects.length === 1 ? 'is' : 'are'} suspended as long as ${defendant} ${defendantVerb('pays', 'pay')} (i) the rent as it falls due plus (ii) the arrears of £`;

      if (paymentTerms.length === 1) {
        list.item('suspended-condition', content => {
          content
            .text(conditionStart)
            .fact('suspended-arrears', money(value(data, 'suspended-arrears')), {
              sourceId: 'suspended-arrears',
            })
            .text(' by ');
          if (paymentTerms[0] === 'one-off') {
            addOneOffTerm(content, data, claimant);
          } else {
            addInstalmentTerm(content, data, claimant);
          }
          content.text('.');
        });
      } else {
        list.item(
          'suspended-condition',
          content => {
            content
              .text(conditionStart)
              .fact('suspended-arrears', money(value(data, 'suspended-arrears')), {
                sourceId: 'suspended-arrears',
              })
              .text(' by:');
          },
          item => {
            item.orderedList('suspended-payment-terms', terms => {
              if (paymentTerms.includes('one-off')) {
                terms.item('suspended-one-off', content => {
                  addOneOffTerm(content, data, claimant);
                  content.text(';');
                });
              }
              if (paymentTerms.includes('instalments')) {
                terms.item('suspended-instalments', content => {
                  addInstalmentTerm(content, data, claimant);
                  content.text(';');
                });
              }
              if (!paymentTerms.length) {
                terms.item('suspended-missing-payment-term', '[select a payment term];');
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
