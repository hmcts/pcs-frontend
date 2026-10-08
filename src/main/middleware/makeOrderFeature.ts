import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { getLaunchDarklyFlag } from '../utils/getLaunchDarklyFlag';

/** Shows the make order journey as not existing while its feature flag is off (and if LaunchDarkly is unavailable). */
export const makeOrderFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (await getLaunchDarklyFlag(req, 'make-order-enabled', false)) {
    return next();
  }
  res.status(404).send('Not Found');
};
