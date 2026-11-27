import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  SAME_TERMS_COSTS,
  addCosts,
  addPossessionDeadline,
  caseManCosts,
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

export function addSuspendedClauses(list: OrderedListBuilder, data: OrderData): void {
  const address = data.propertyAddress || '[property address not provided]';
  const { claimant, defendant } = partyLabels(data);
  const options = values(data, 'suspended-options');
  const costs = caseManCosts(claimant, defendant);

  list.item('suspended-possession', content => {
    content
      .text(`${sentenceCase(defendant)} must leave and give up possession of `)
      .fact('suspended-address', address)
      .text(` to ${claimant} on or before `);
    addPossessionDeadline(content, data, 'suspended-deadline', 'suspended-by-date', 'suspended-by-time');
    content.text('.');
  });

  if (options.includes('money-claim-adjourned')) {
    list.item('suspended-money-claim-adjourned', 'The money claim is adjourned generally with liberty to restore.');
  } else if (options.includes('money-judgment-arrears')) {
    list.item('suspended-money-judgment', content => {
      content
        .text(`Judgment is entered for ${claimant} against ${defendant} in the sum of £`)
        .fact('suspended-money-judgment-amount', money(value(data, 'suspended-arrears')), {
          sourceId: 'suspended-arrears',
        })
        .text('.');
    });
  }

  if (hasCosts(data, costs)) {
    list.item('costs', content => addCosts(content, data, costs));
  }

  const suspended = ['the possession order'];
  if (options.includes('money-judgment-arrears') && selected(data, 'suspended-mj-same-terms', 'yes')) {
    suspended.push('the money judgment');
  }
  if (selected(data, 'costs', 'yes') && SAME_TERMS_COSTS.has(value(data, 'costs-choice'))) {
    suspended.push('any costs order');
  }
  addPaymentConditions(list, data, 'suspended', `${sentenceCase(claimant)} may not enforce ${joinList(suspended)} if`);
  list.item(
    'suspended-paid-in-full',
    `Once ${defendant} ${data.defendants.length > 1 ? 'have' : 'has'} paid all the sums ordered, ${claimant} may no longer enforce this order.`
  );
  if (options.includes('warrant-on-notice')) {
    list.item(
      'suspended-warrant-on-notice',
      'Any application for a warrant of possession must be heard on notice to all parties unless the Court orders otherwise.'
    );
  }
}
