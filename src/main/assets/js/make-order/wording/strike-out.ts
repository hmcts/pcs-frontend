import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addApplicationDecisions } from './application';
import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels, selectedControlId, value, values } from './common';
import { addEnforcementTransfer, transfersEnforcement } from './enforcement-transfer';

const OUTCOMES: Record<string, string> = {
  'struck-out': 'struck out',
  dismissed: 'dismissed',
};

export function buildStrikeOutDismissalOrder(data: OrderData): DocWeaveDocument {
  const subjects = values(data, 'strike-subjects');
  const outcomes = ['claim', 'counterclaim']
    .filter(subject => subjects.includes(subject) && OUTCOMES[value(data, `strike-${subject}-outcome`)])
    .map(subject => ({ subject, field: `strike-${subject}-outcome` }));
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  const transferred = transfersEnforcement(data);

  return buildDoc(order => {
    addPreamble(order, data);
    if (outcomes.length || transferred || hasCosts(data, costs)) {
      order.orderedList('strike-out-clauses', list => {
        for (const { subject, field } of outcomes) {
          // The claim's clause keeps the id saved orders gave it.
          list.item(subject === 'claim' ? 'outcome' : `${subject}-outcome`, content => {
            content.fact('outcome', `The ${subject} is ${OUTCOMES[value(data, field)]}.`, {
              sourceId: selectedControlId(data, field),
            });
          });
        }
        if (transferred) {
          addEnforcementTransfer(list, data);
        }
        if (hasCosts(data, costs)) {
          list.item('strike-out-costs', content => addCosts(content, data, costs));
        }
      });
    }
    addApplicationDecisions(order, data);
  });
}
