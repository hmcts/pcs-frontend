import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addApplicationDecisions } from './application';
import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels } from './common';

/**
 * An order that leaves the claim as it is: what it decides is the applications, or what the judge writes in the
 * preview after "IT IS ORDERED THAT:".
 */
export function buildNoOrderOnClaim(data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
    addPreamble(order, data);
    addApplicationDecisions(order, data);
    if (hasCosts(data, costs)) {
      order.paragraph('no-order-costs', content => addCosts(content, data, costs));
    }
  });
}
