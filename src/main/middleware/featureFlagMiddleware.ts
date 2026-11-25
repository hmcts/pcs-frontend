import { NextFunction, Request, RequestHandler, Response } from 'express';

import { RELEASE_1B_ENABLED } from '@utils/featureFlags';
import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';

export const featureFlagMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const release1bEnabled = await getLaunchDarklyFlag(req, RELEASE_1B_ENABLED, false);

  res.locals.featureFlags = {
    release1bEnabled,
  };

  next();
};
