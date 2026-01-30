import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../utils/getLaunchDarklyFlag';

export const isNoticeServed = async (req: Request): Promise<boolean> => {
  return getLaunchDarklyFlag<boolean>(req, 'is-notice-served', false);
};
