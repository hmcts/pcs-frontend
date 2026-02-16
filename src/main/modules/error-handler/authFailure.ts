import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

import { HTTPError } from '../../HttpError';

const logger = Logger.getLogger('authFailure');

// Auth failure error handler - catches 401 errors and redirects to login
// This is a safety net for cases where downstream services return 401
// despite token refresh attempts
export const authFailure = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const httpError = err instanceof HTTPError ? err : null;

  // only handle 401 errors and if the response has not been sent yet
  if ((httpError && httpError.status !== 401) || res.headersSent || res.writableEnded) {
    return next(err);
  }

  logger.info('Redirecting to login due to invalid session', {
    event: 'redirect_to_login',
    reason: 'invalid_session',
    path: req.originalUrl,
    userId: req.session?.user?.uid,
  });

  if (req.session) {
    req.session.returnTo = req.originalUrl;
    const authSessionKeys = ['user', 'ccdCase', 'codeVerifier', 'nonce'] as const;
    for (const key of authSessionKeys) {
      delete req.session[key];
    }
  }

  return res.redirect('/login');
};
