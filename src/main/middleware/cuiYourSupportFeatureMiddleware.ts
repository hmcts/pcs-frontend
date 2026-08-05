import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

// Feature gate for the CUI Your Support (Reasonable Adjustments) routes.
export const cuiYourSupportFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (await isCuiYourSupportEnabled(req)) {
    return next();
  }
  return handleRespondToClaimDisabled(req, res);
};
