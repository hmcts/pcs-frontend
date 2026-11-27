import { NextFunction, Request, Response } from 'express';

// Set by @hmcts/cookie-manager as JSON, for example {"analytics":"on","apm":"off"}.
export const COOKIE_PREFERENCES_COOKIE = 'pcs-cookie-preferences';

export const hasAnalyticsConsent = (cookieValue: unknown): boolean => {
  if (typeof cookieValue !== 'string') {
    return false;
  }
  try {
    const preferences: unknown = JSON.parse(cookieValue);
    return (
      typeof preferences === 'object' &&
      preferences !== null &&
      (preferences as Record<string, unknown>).analytics === 'on'
    );
  } catch {
    return false;
  }
};

/**
 * Tells the templates whether the user has accepted analytics cookies, so Google Tag Manager only loads after consent
 * and doesn't depend on the container's triggers.
 */
export const analyticsConsentMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.locals.analyticsConsent = hasAnalyticsConsent(req.cookies?.[COOKIE_PREFERENCES_COOKIE]);
  next();
};
