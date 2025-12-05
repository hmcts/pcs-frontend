import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Authentication middleware
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.AUTH_DISABLED === 'true') {
    req.session.user =
      req.session.user ||
      ({
        uid: 'dev-user',
        roles: ['judge'],
        accessToken: 'dev-access-token',
        idToken: 'dev-id-token',
        refreshToken: 'dev-refresh-token',
        sub: 'dev-user',
        email: 'judge@example.com',
        givenName: 'Judith',
        familyName: 'Daley',
      } as unknown as Request['session']['user']);
    req.app.locals.nunjucksEnv.addGlobal('user', req.session.user);
    return next();
  }

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
