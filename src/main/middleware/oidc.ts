import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import * as jose from 'jose';

const logger = Logger.getLogger('oidcMiddleware');

// In-memory map to prevent parallel refresh attempts for the same session
const refreshInProgress = new Map<string, Promise<void>>();
const REFRESH_TIMEOUT_MS = 10000; // 10 seconds timeout for refresh operations

/** Clears the refresh-in-progress map. Exported for tests only. */
export const clearRefreshInProgressForTesting = (): void => refreshInProgress.clear();

/**
 * Authentication middleware that checks token expiry and refreshes if needed
 * @param req
 * @param res
 * @param next
 */
export const oidcMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only set returnTo when about to redirect to login (avoids overwriting on every request which can cause loops)
    const setReturnToAndRedirectToLogin = (): void => {
      if (req.session) {
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
      if (req.session) {
        delete req.session.user;
      }
      return setReturnToAndRedirectToLogin();
    }

    // Decode JWT to check expiry
    let tokenExp: number | undefined;
    let isExpired = false;

    try {
      const decoded = jose.decodeJwt(accessToken);
      tokenExp = decoded.exp;

      if (tokenExp) {
        let accessTokenEarlyRefreshSeconds = 30;
        try {
          accessTokenEarlyRefreshSeconds = config.get<number>('oidc.accessTokenEarlyRefreshSeconds');
        } catch {
          // Use default value if config not found
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiryThreshold = tokenExp - accessTokenEarlyRefreshSeconds;
        isExpired = nowSeconds >= expiryThreshold;
      } else {
        // If no exp claim, assume expired to be safe
        isExpired = true;
      }
    } catch (error) {
      // If decoding fails, assume expired
      isExpired = true;
      logger.warn('Failed to decode access token, treating as expired', {
        event: 'token_refresh_attempt',
        userId: user.uid,
        path: req.originalUrl,
        reason: 'decode_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // If token is expired or near-expiry, attempt refresh
    if (isExpired) {
      if (!refreshToken) {
        if (req.session) {
          delete req.session.user;
        }
        return setReturnToAndRedirectToLogin();
      }

      // Check if refresh is already in progress for this session
      const sessionId = req.sessionID;
      const existingRefresh = refreshInProgress.get(sessionId);

      if (existingRefresh) {
        // Wait for existing refresh to complete
        try {
          await existingRefresh;
        } catch {
          // If refresh failed, continue to handle it below
        }
        // Re-check user after refresh (might have been cleared)
        if (!req.session?.user) {
          return setReturnToAndRedirectToLogin();
        }
        // Update nunjucks global and continue
        req.app.locals.nunjucksEnv.addGlobal('user', req.session.user);
        return next();
      }

      // Start new refresh
      const refreshPromise = (async () => {
        try {
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

          // Update session with new tokens
          req.session.user = {
            ...user,
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken || refreshToken,
            idToken: refreshResult.idToken || user.idToken,
          };
        } catch (error) {
          logger.error('Token refresh failed', {
            event: 'token_refresh_failure',
            userId: user.uid,
            path: req.originalUrl,
            reason: 'refresh_failed',
            error: error instanceof Error ? error.message : String(error),
          });

          // Clear session on refresh failure
          if (req.session) {
            delete req.session.user;
          }

          throw error;
        } finally {
          // Clean up refresh tracking after timeout
          setTimeout(() => {
            refreshInProgress.delete(sessionId);
          }, REFRESH_TIMEOUT_MS);
        }
      })();

      refreshInProgress.set(sessionId, refreshPromise);

      try {
        await refreshPromise;
      } catch {
        // Refresh failed, redirect to login
        logger.info('Redirecting to login due to refresh failure', {
          event: 'redirect_to_login',
          userId: user.uid,
          path: req.originalUrl,
          reason: 'refresh_failed',
        });
        return setReturnToAndRedirectToLogin();
      }

      // Re-check user after refresh (might have been cleared)
      if (!req.session?.user) {
        return setReturnToAndRedirectToLogin();
      }
    }

    // Token is valid, update nunjucks global and continue
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
