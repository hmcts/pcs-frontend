import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Authentication middleware
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session?.user) {
    req.app.locals.nunjucksEnv.addGlobal('user', req.session.user);
    return next();
  }

  // Store the current path in session before redirecting
  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }
  res.redirect('/login');
};
