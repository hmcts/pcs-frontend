import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, caseManCosts, hasCosts, partyLabels, values } from './common';
import { addListing } from './listing';

/**
 * An order made on paper with no application to decide: the judge writes it in the preview, after "IT IS
 * ORDERED THAT:", which lists a hearing on notice if they ticked it, then costs.
 */
export function buildOnPaperOrder(data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  const listed = values(data, 'paper-list').includes('yes');

  return buildDoc(order => {
    order.paragraph('paper-considered', 'UPON the Court considering the papers without a hearing');
    order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
    if (!listed && !hasCosts(data, costs)) {
      return;
    }
    order.orderedList('paper-clauses', list => {
      if (listed) {
        addListing(list, data, 'list', 'paper', 'The claim shall be listed for a hearing on notice to all parties');
      }
      if (hasCosts(data, costs)) {
        list.item('paper-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
