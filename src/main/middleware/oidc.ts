import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

/**
 * Authentication middleware
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const logger = Logger.getLogger('oidcMiddleware');
  if (req.session?.user) {
    return next();
  }
  logger.info('redirecting to login');
  res.redirect('/login');
};
