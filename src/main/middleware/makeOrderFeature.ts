import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isMakeOrderEnabled } from '../utils/isMakeOrderEnabled';

/** Shows the make order journey as not existing while its feature flag is off. */
export const makeOrderFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (await isMakeOrderEnabled(req)) {
    return next();
  }
  res.status(404).send('Not Found');
};
