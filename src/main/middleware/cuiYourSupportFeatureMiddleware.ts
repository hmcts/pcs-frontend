import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';
import { safeRedirect303 } from '@utils/safeRedirect';

// Feature gate for the CUI Your Support (Reasonable Adjustments) routes.
export const cuiYourSupportFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (await isCuiYourSupportEnabled(req)) {
    return next();
  }
  const caseReference = String(req.params.caseReference || '');
  return safeRedirect303(res, `/case/${caseReference}/respond-to-claim/language-used?nav=1`, `/case/${caseReference}`, [
    '/case',
  ]);
};
