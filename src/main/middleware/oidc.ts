import config from 'config';
import { type Request, type RequestHandler } from 'express';
import type { SessionData } from 'express-session';
import * as jose from 'jose';

import { Logger } from '@modules/logger';
import { RedisLockTimeoutError, withRedisLock } from '@modules/redisLock';

const logger = Logger.getLogger('oidcMiddleware');

const REFRESH_LOCK_TTL_MS = 15_000;
const REFRESH_LOCK_WAIT_TIMEOUT_MS = 10_000;

function shouldRefreshAccessToken(accessToken: string | undefined): boolean {
  if (!accessToken) {
    return true;
  }
  try {
    const decoded = jose.decodeJwt(accessToken);
    if (!decoded.exp) {
      return true;
    }
    const earlyRefreshSeconds = config.get<number>('oidc.accessTokenEarlyRefreshSeconds');
    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds >= decoded.exp - earlyRefreshSeconds;
  } catch {
    return true;
  }
}

function readSessionFromStore(req: Request): Promise<SessionData | null> {
  return new Promise((resolve, reject) => {
    if (!req.sessionStore?.get) {
      resolve(null);
      return;
    }
    req.sessionStore.get(req.sessionID, (err, sess) => {
      if (err) {
        reject(err);
      } else {
        resolve(sess ?? null);
      }
    });
  });
}

/**
 * Authentication middleware that checks token expiry and refreshes if needed.
 * Refresh is serialised per session via a Redis-backed lock so concurrent
 * requests on multiple pods don't each fire a refresh against IDAM with the
 * same refresh token.
 */
export const oidcMiddleware: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const setReturnToAndRedirectToLogin = (): void => {
      if (req.session && !req.session.returnTo) {
        req.session.returnTo = req.originalUrl;
      }
      res.redirect('/login');
    };

    if (!req.session?.user) {
      return setReturnToAndRedirectToLogin();
    }

    const user = req.session.user;
    const { accessToken, refreshToken } = user;

    if (!accessToken) {
      delete req.session.user;
      return setReturnToAndRedirectToLogin();
    }

    if (!shouldRefreshAccessToken(accessToken)) {
      req.app.locals.nunjucksEnv.addGlobal('user', req.session.user);
      return next();
    }

    if (!refreshToken) {
      delete req.session.user;
      return setReturnToAndRedirectToLogin();
    }

    const redis = req.app.locals.redisClient;
    if (!redis) {
      logger.error('redisClient missing on app.locals; cannot coordinate token refresh');
      return next(new Error('redisClient not configured'));
    }

    try {
      await withRedisLock(
        redis,
        `pcs:oidc-refresh:${req.sessionID}`,
        { ttlMs: REFRESH_LOCK_TTL_MS, waitTimeoutMs: REFRESH_LOCK_WAIT_TIMEOUT_MS },
        async () => {
          // Another pod (or an earlier waiter) may have already refreshed for
          // this session. Re-read from the store and adopt if fresh.
          const fresh = await readSessionFromStore(req).catch(err => {
            logger.warn('Failed to re-read session from store after acquiring refresh lock', {
              userId: user.uid,
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          });
          if (fresh?.user?.accessToken && !shouldRefreshAccessToken(fresh.user.accessToken)) {
            req.session.user = fresh.user;
            return;
          }

          const oidcModule = req.app.locals.oidc;
          if (!oidcModule) {
            throw new Error('OIDC module not available in app.locals');
          }

          logger.info('Attempting token refresh', {
            event: 'token_refresh_attempt',
            userId: user.uid,
            path: req.originalUrl,
          });

          const refreshResult = await oidcModule.refreshUserTokens(refreshToken);

          logger.info('Token refresh successful', {
            event: 'token_refresh_success',
            userId: user.uid,
            path: req.originalUrl,
          });

          req.session.user = {
            ...user,
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken || refreshToken,
            idToken: refreshResult.idToken || user.idToken,
          };
        }
      );
    } catch (error) {
      const reason = error instanceof RedisLockTimeoutError ? 'lock_timeout' : 'refresh_failed';
      logger.error('Token refresh failed', {
        event: 'token_refresh_failure',
        userId: user.uid,
        path: req.originalUrl,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });

      if (req.session) {
        delete req.session.user;
      }
      logger.info('Redirecting to login due to refresh failure', {
        event: 'redirect_to_login',
        userId: user.uid,
        path: req.originalUrl,
        reason,
      });
      return setReturnToAndRedirectToLogin();
    }

    if (!req.session?.user) {
      return setReturnToAndRedirectToLogin();
    }

    req.app.locals.nunjucksEnv.addGlobal('user', req.session.user);
    next();
  } catch (error) {
    logger.error('Unexpected error in oidcMiddleware', {
      error: error instanceof Error ? error.message : String(error),
      path: req.originalUrl,
    });
    next(error);
  }
};
