import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isStaffUser } from '../steps/utils';

/** Keeps pages meant for HMCTS staff and judges away from citizens and legal representatives. */
export const staffAccessMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (isStaffUser(req)) {
    return next();
  }

  res.status(404).send('Not Found');
};
