import { NextFunction, Request, Response } from 'express';

/**
 * Authentication middleware
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session?.user) {
    return next();
  }
  res.redirect('/login');
};
