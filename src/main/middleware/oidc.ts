import config from 'config';
import { type Request, type RequestHandler } from 'express';
import type { SessionData } from 'express-session';
import * as jose from 'jose';

import { Logger } from '@modules/logger';
import { RedisLockTimeoutError, withRedisLock } from '@modules/redisLock';

const logger = Logger.getLogger('oidcMiddleware');

const REFRESH_LOCK_TTL_MS = 15_000;
const REFRESH_LOCK_WAIT_TIMEOUT_MS = 10_000;

interface RefreshLogContext {
  userId: unknown;
  path: string;
}

function shouldRefreshAccessToken(accessToken: string | undefined, context: RefreshLogContext): boolean {
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
  } catch (error) {
    logger.warn('Failed to decode access token, treating as expired', {
      event: 'token_refresh_attempt',
      ...context,
      reason: 'decode_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save(err => (err ? reject(err) : resolve()));
  });
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
        req.session.save(() => res.redirect('/login'));
        return;
      }
      res.redirect('/login');
    };

    if (!req.session?.user) {
      return setReturnToAndRedirectToLogin();
    }

    const user = req.session.user;
    const { accessToken, refreshToken } = user;
    const logContext: RefreshLogContext = { userId: user.uid, path: req.originalUrl };

    if (!accessToken) {
      delete req.session.user;
      return setReturnToAndRedirectToLogin();
    }

    if (!shouldRefreshAccessToken(accessToken, logContext)) {
      res.locals.user = req.session.user;
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
              ...logContext,
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          });
          if (fresh?.user?.accessToken && !shouldRefreshAccessToken(fresh.user.accessToken, logContext)) {
            req.session.user = fresh.user;
            return;
          }

          const oidcModule = req.app.locals.oidc;
          if (!oidcModule) {
            throw new Error('OIDC module not available in app.locals');
          }

          logger.info('Attempting token refresh', {
            event: 'token_refresh_attempt',
            ...logContext,
          });

          const refreshResult = await oidcModule.refreshUserTokens(refreshToken);

          logger.info('Token refresh successful', {
            event: 'token_refresh_success',
            ...logContext,
          });

          req.session.user = {
            ...user,
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken || refreshToken,
            idToken: refreshResult.idToken || user.idToken,
          };

          // Persist before releasing the lock. express-session would otherwise
          // only write at the end of the response, so the next holder of the
          // lock would re-read the stale token from the store and refresh again
          // with a refresh token IDAM has already rotated away.
          await saveSession(req);
        }
      );
    } catch (error) {
      if (error instanceof RedisLockTimeoutError) {
        // Couldn't coordinate, but the session is untouched and whoever holds
        // the lock is refreshing it. Carry on with the current token rather
        // than signing the user out over a Redis hiccup.
        logger.warn('Proceeding without refresh; timed out waiting for the refresh lock', {
          event: 'token_refresh_failure',
          ...logContext,
          reason: 'lock_timeout',
        });
        res.locals.user = req.session.user;
        return next();
      }

      logger.error('Token refresh failed', {
        event: 'token_refresh_failure',
        ...logContext,
        reason: 'refresh_failed',
        error: error instanceof Error ? error.message : String(error),
      });

      if (req.session) {
        delete req.session.user;
      }
      logger.info('Redirecting to login due to refresh failure', {
        event: 'redirect_to_login',
        ...logContext,
        reason: 'refresh_failed',
      });
      return setReturnToAndRedirectToLogin();
    }

    if (!req.session?.user) {
      return setReturnToAndRedirectToLogin();
    }

    // Token is valid; expose user to templates via per-request res.locals
    res.locals.user = req.session.user;
    next();
  } catch (error) {
    logger.error('Unexpected error in oidcMiddleware', {
      error: error instanceof Error ? error.message : String(error),
      path: req.originalUrl,
    });
    next(error);
  }
};
