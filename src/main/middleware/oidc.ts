import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Authentication middleware
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session?.user) {
    return next();
  }
  res.redirect('/login');
};
