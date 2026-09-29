import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels } from './common';

export function buildFreeFormOrder(data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
    // The judge writes the order itself in the preview, after "IT IS ORDERED THAT:".
    addPreamble(order, data);
    if (hasCosts(data, costs)) {
      order.paragraph('free-form-costs', content => addCosts(content, data, costs));
    }
  });
}
