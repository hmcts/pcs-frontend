import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';

export const MAKE_ORDER_ENABLED = 'make-order-enabled';

/** Whether judges can make an order here. Off by default, so the journey stays closed if LaunchDarkly is unavailable. */
export function isMakeOrderEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, MAKE_ORDER_ENABLED, false);
}
