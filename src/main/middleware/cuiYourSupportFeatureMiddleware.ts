import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

// Pattern-A feature gate for the CUI Your Support (Reasonable Adjustments) routes. When the flag is
// off, the feature is unavailable: behave like the respond-to-claim "disabled" path (redirect away)
// instead of running the handler.
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
