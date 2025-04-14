import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, RequestHandler, Response } from 'express';

export const oidcMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const logger = Logger.getLogger('oidcMiddleware');
  if (req.session?.user) {
    return next();
  }
  logger.info('unauthenticated user, redirecting to login');
  res.redirect('/login');
};
