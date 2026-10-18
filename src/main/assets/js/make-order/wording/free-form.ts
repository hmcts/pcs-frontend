import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels, values } from './common';
import { addEnforcementTransfer, transfersEnforcement } from './enforcement-transfer';
import { addListing } from './listing';

export function buildFreeFormOrder(data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  // Only an order made without a hearing asks whether to list one.
  const listed = data.withoutHearing && values(data, 'list-on-notice').includes('yes');
  const transferred = transfersEnforcement(data);

  return buildDoc(order => {
    // The judge writes the order itself in the preview, after "IT IS ORDERED THAT:".
    addPreamble(order, data);
    if (listed || transferred) {
      order.orderedList('free-form-clauses', list => {
        if (listed) {
          addListing(list, data, 'list', 'free-form', 'The claim shall be listed for a hearing on notice to all parties');
        }
        if (transferred) {
          addEnforcementTransfer(list, data);
        }
      });
    }
    if (hasCosts(data, costs)) {
      order.paragraph('free-form-costs', content => addCosts(content, data, costs));
    }
  });
}
