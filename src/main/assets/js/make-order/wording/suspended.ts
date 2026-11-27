import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  SAME_TERMS_COSTS,
  addCosts,
  addPossessionDeadline,
  caseManCosts,
  hasCosts,
  money,
  partyLabels,
  selected,
  sentenceCase,
  value,
  values,
} from './common';
import { addPaymentTermsList } from './payment-conditions';

export function addSuspendedClauses(list: OrderedListBuilder, data: OrderData): void {
  const address = data.propertyAddress || '[property address not provided]';
  const { claimant, defendant, defendantVerb } = partyLabels(data);
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
      if (selected(data, 'suspended-mj-same-terms', 'yes')) {
        content.text(' Enforcement of the money judgment is suspended on the same terms as the possession order.');
      }
    });
  }

  addPaymentTermsList(
    list,
    data,
    'suspended',
    `${sentenceCase(claimant)} may not enforce the possession order or any money judgment or costs order suspended on the same terms for as long as ` +
      `${defendant} ${defendantVerb('pays', 'pay')} the current rent when it is due and ${defendantVerb('makes', 'make')} the following payments towards the arrears and any sums suspended on those terms:`
  );
  list.item(
    'suspended-paid-in-full',
    `Any payments made by ${defendant} in addition to the current rent will first reduce the rent arrears and then any costs order suspended on those terms. ` +
      `Once ${defendant} ${defendantVerb('has', 'have')} paid all the sums ordered, ${claimant} may no longer enforce this order.`
  );

  if (hasCosts(data, costs)) {
    list.item('suspended-costs', content => {
      addCosts(content, data, costs);
      if (SAME_TERMS_COSTS.has(value(data, 'costs-choice'))) {
        content.text(' Enforcement of this costs order is suspended on the same terms as the possession order.');
      }
    });
  }
  if (options.includes('warrant-on-notice')) {
    list.item(
      'suspended-warrant-on-notice',
      'Any application for a warrant of possession must be heard on notice to all parties unless the Court orders otherwise.'
    );
  }
}
