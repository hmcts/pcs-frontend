import { NextFunction, Request, RequestHandler, Response } from 'express';
import config from 'config';
import { Logger } from '@hmcts/nodejs-logging';

const logger = Logger.getLogger('oidc');

const pickAccessToken = (): string => {
  const envToken = process.env.PCS_IDAM_TOKEN || process.env.IDAM_ACCESS_TOKEN;
  if (envToken) {
    logger.info('[oidc] Using access token from environment');
    return envToken;
  }
  if ((config as { has?: (key: string) => boolean }).has?.('secrets.pcs.pcs-judge-token')) {
    logger.info('[oidc] Using pcs-judge-token from config');
    return config.get('secrets.pcs.pcs-judge-token') as string;
  }
  if ((config as { has?: (key: string) => boolean }).has?.('secrets.pcs.dev-access-token')) {
    logger.info('[oidc] Using dev-access-token from config');
    return config.get('secrets.pcs.dev-access-token') as string;
  }
  logger.warn('[oidc] Falling back to hard-coded dev-access-token');
  return 'dev-access-token';
};

/**
 * Authentication middleware
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.AUTH_DISABLED === 'true') {
    const existing = (req.session.user as Record<string, unknown>) || {};
    req.session.user = {
      uid: existing.uid || 'dev-user',
      roles: existing.roles || ['judge'],
      accessToken: pickAccessToken(),
      idToken: existing.idToken || 'dev-id-token',
      refreshToken: existing.refreshToken || 'dev-refresh-token',
      sub: existing.sub || 'dev-user',
      email: existing.email || 'judge@example.com',
      givenName: existing.givenName || 'Judith',
      familyName: existing.familyName || 'Daley',
    } as unknown as Request['session']['user'];
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
