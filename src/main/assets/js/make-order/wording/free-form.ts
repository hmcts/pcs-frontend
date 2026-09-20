import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addPreamble, splitParagraphs, value } from './common';

export function buildFreeFormOrder(data: OrderData): DocWeaveDocument {
  return buildDoc(order => {
    addPreamble(order, data);
    splitParagraphs(value(data, 'free-form-text')).forEach((text, index) =>
      order.paragraph(`free-form-${index}`, content => {
        content.fact('text', text, { sourceId: 'free-form-text' });
      })
    );
  });
}
