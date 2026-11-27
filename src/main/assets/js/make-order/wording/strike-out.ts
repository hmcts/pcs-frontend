import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { partyLabels, possessive, selectedControlId, sentenceCase, value, values } from './common';

const OUTCOMES: Record<string, string> = {
  'struck-out': 'struck out',
  dismissed: 'dismissed',
};

export function addStrikeOutDismissalClauses(list: OrderedListBuilder, data: OrderData): void {
  const subjects = values(data, 'strike-subjects');
  const { claimant, defendant } = partyLabels(data);
  const outcomes = ['claim', 'counterclaim']
    .filter(subject => subjects.includes(subject) && OUTCOMES[value(data, `strike-${subject}-outcome`)])
    .map(subject => ({ subject, field: `strike-${subject}-outcome` }));

  for (const { subject, field } of outcomes) {
    // The case supplies whether a counterclaim exists, without identifying which defendants made it.
    const owner = subject === 'claim' ? claimant : data.defendants.length === 1 ? defendant : '';
    const description = owner ? `${possessive(owner)} ${subject}` : `the ${subject}`;
    list.item(`${subject}-outcome`, content => {
      content.fact('outcome', `${sentenceCase(description)} is ${OUTCOMES[value(data, field)]}.`, {
        sourceId: selectedControlId(data, field),
      });
    });
  }
}
