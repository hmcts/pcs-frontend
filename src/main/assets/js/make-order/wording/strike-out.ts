import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels, selectedControlId, value } from './common';

const OUTCOMES: Record<string, string> = {
  'struck-out': 'The claim is struck out.',
  dismissed: 'The claim is dismissed.',
};

export function buildStrikeOutDismissalOrder(data: OrderData): DocWeaveDocument {
  const outcome = OUTCOMES[value(data, 'strike-claim-outcome')];
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
    addPreamble(order, data);
    if (!outcome) {
      return;
    }
    order.orderedList('strike-out-clauses', list => {
      list.item('outcome', content => {
        content.fact('outcome', outcome, { sourceId: selectedControlId(data, 'strike-claim-outcome') });
      });
      if (hasCosts(data, costs)) {
        list.item('strike-out-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
