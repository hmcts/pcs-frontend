import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels, values } from './common';
import { addListing } from './listing';

export function buildFreeFormOrder(data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  // Only an order made without a hearing asks whether to list one.
  const listed = data.withoutHearing && values(data, 'list-on-notice').includes('yes');

  return buildDoc(order => {
    // The judge writes the order itself in the preview, after "IT IS ORDERED THAT:".
    addPreamble(order, data);
    if (listed) {
      order.orderedList('free-form-clauses', list => {
        addListing(list, data, 'list', 'free-form', 'The claim shall be listed for a hearing on notice to all parties');
      });
    }
    if (hasCosts(data, costs)) {
      order.paragraph('free-form-costs', content => addCosts(content, data, costs));
    }
  });
}
