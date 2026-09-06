import { buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

export function buildStrikeOutDismissalOrder(_data: OrderData): ReturnType<typeof buildOrder> {
  return buildOrder(order => {
    order.paragraph('strike-out-dismissal', () => undefined);
  });
}
