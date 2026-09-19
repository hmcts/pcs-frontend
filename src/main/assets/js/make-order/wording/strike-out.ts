import { buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

export function buildStrikeOutDismissalOrder(_data: OrderData): ReturnType<typeof buildDoc> {
  return buildDoc(order => {
    order.paragraph('strike-out-dismissal', () => undefined);
  });
}
