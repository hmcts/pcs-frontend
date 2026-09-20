import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addPreamble, value } from './common';

export function buildFreeFormOrder(data: OrderData): DocWeaveDocument {
  return buildDoc(order => {
    addPreamble(order, data);
    order.text('free-form', value(data, 'free-form-text'), { sourceId: 'free-form-text' });
  });
}
