import { NextFunction, Request, RequestHandler, Response } from 'express';

import { BAILIFF_MANAGEMENT_ENABLED } from '@utils/featureFlags';
import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';

export const featureFlagMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const bailiffManagementEnabled = await getLaunchDarklyFlag(req, BAILIFF_MANAGEMENT_ENABLED, false);

  res.locals.featureFlags = {
    bailiffManagementEnabled,
  };

  next();
};
