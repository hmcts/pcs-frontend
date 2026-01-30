import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../utils/getLaunchDarklyFlag';

export const isNoticeDateProvided = async (req: Request): Promise<boolean> => {
  const result = await getLaunchDarklyFlag<string>(req, 'is-notice-date-provided', '21 05 2023');
  req.session.noticeDate = result;
  return result !== '';
};
