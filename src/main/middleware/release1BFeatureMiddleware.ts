import type { RequestHandler } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { RELEASE_1B_ENABLED } from '@utils/isRelease1BEnabled';

export const release1BFeatureMiddleware: RequestHandler = async (req, res, next): Promise<void> => {
  res.locals.release1bEnabled = await getLaunchDarklyFlag(req, RELEASE_1B_ENABLED, false);
  next();
};
