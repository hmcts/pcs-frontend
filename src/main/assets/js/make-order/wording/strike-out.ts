import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

export function buildStrikeOutDismissalOrder(_data: OrderData): DocWeaveDocument {
  return buildDoc(order => {
    order.paragraph('strike-out-dismissal', () => undefined);
  });
}
