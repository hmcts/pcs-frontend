import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels, value } from './common';

export function buildFreeFormOrder(data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
    addPreamble(order, data);
    order.text('free-form', value(data, 'free-form-text'), { sourceId: 'free-form-text' });
    if (hasCosts(data, costs)) {
      order.paragraph('free-form-costs', content => addCosts(content, data, costs));
    }
  });
}
