import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { selectedControlId, value, values } from './common';

const OUTCOMES: Record<string, string> = {
  'struck-out': 'struck out',
  dismissed: 'dismissed',
};

export function addStrikeOutDismissalClauses(list: OrderedListBuilder, data: OrderData): void {
  const subjects = values(data, 'strike-subjects');
  const outcomes = ['claim', 'counterclaim']
    .filter(subject => subjects.includes(subject) && OUTCOMES[value(data, `strike-${subject}-outcome`)])
    .map(subject => ({ subject, field: `strike-${subject}-outcome` }));

  for (const { subject, field } of outcomes) {
    list.item(`${subject}-outcome`, content => {
      content.fact('outcome', `The ${subject} is ${OUTCOMES[value(data, field)]}.`, {
        sourceId: selectedControlId(data, field),
      });
    });
  }
}
