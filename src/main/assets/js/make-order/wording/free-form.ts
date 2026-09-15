import { buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addPreamble, value } from './common';

export function buildFreeFormOrder(data: OrderData): ReturnType<typeof buildOrder> {
  return buildOrder(order => {
    addPreamble(order, data);
    value(data, 'free-form-text')
      .split(/\n\s*\n/)
      .map(text => text.trim())
      .filter(Boolean)
      .forEach((text, index) =>
        order.paragraph(`free-form-${index}`, content => {
          content.fact('text', text, { sourceId: 'free-form-text' });
        })
      );
  });
}
