import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { RELEASE_1_4_ENABLED } from '@utils/respondToClaimFlags';

export const footerAccessMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  res.locals.release1dot4Enabled = await getLaunchDarklyFlag(req, RELEASE_1_4_ENABLED, false);
  next();
};
