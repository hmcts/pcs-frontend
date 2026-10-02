import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels, selectedControlId, value, values } from './common';

const OUTCOMES: Record<string, string> = {
  'struck-out': 'struck out',
  dismissed: 'dismissed',
};

export function buildStrikeOutDismissalOrder(data: OrderData): DocWeaveDocument {
  const subjects = values(data, 'strike-subjects');
  const outcomes = ['claim', 'counterclaim']
    .filter(subject => subjects.includes(subject) && OUTCOMES[value(data, `strike-${subject}-outcome`)])
    .map(subject => ({ subject, field: `strike-${subject}-outcome` }));
  const applicationDismissed = subjects.includes('application');
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
    addPreamble(order, data);
    if (!outcomes.length && !applicationDismissed) {
      return;
    }
    order.orderedList('strike-out-clauses', list => {
      for (const { subject, field } of outcomes) {
        // The claim's clause keeps the id saved orders gave it.
        list.item(subject === 'claim' ? 'outcome' : `${subject}-outcome`, content => {
          content.fact('outcome', `The ${subject} is ${OUTCOMES[value(data, field)]}.`, {
            sourceId: selectedControlId(data, field),
          });
        });
      }
      if (applicationDismissed) {
        list.item('application-outcome', 'The application is dismissed.');
      }
      if (hasCosts(data, costs)) {
        list.item('strike-out-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
