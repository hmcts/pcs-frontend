import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addApplicationDecisions } from './application';
import {
  SAME_TERMS_COSTS,
  addCosts,
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
import { addPaymentConditions } from './payment-conditions';

export function buildSuspendedOrder(data: OrderData): DocWeaveDocument {
  const address = data.propertyAddress || '[property address not provided]';
  const { claimant, defendant } = partyLabels(data);
  const options = values(data, 'suspended-options');
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
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

      const suspended = ['Execution of the order for possession'];
      if (options.includes('money-judgment-arrears') && selected(data, 'suspended-mj-same-terms', 'yes')) {
        suspended.push('enforcement of the money judgment');
      }
      if (selected(data, 'costs', 'yes') && SAME_TERMS_COSTS.has(value(data, 'costs-choice'))) {
        suspended.push('enforcement of any order for costs');
      }
      addPaymentConditions(
        list,
        data,
        'suspended',
        `${joinList(suspended)} ${suspended.length === 1 ? 'is' : 'are'} suspended as long as`
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
    });
    addApplicationDecisions(order, data);
  });
}
