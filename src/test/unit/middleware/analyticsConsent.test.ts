import type { NextFunction, Request, Response } from 'express';

import { analyticsConsentMiddleware, hasAnalyticsConsent } from '../../../main/middleware';

describe('hasAnalyticsConsent', () => {
  it.each([
    ['{"analytics":"on","apm":"off"}', true],
    ['{"analytics":"off","apm":"on"}', false],
    ['{"apm":"on"}', false],
    ['{"analytics":true}', false],
    ['not json', false],
    ['null', false],
    ['"on"', false],
    [undefined, false],
  ])('returns %p as %p', (cookieValue, expected) => {
    expect(hasAnalyticsConsent(cookieValue)).toBe(expected);
  });
});

describe('analyticsConsentMiddleware', () => {
  const run = (cookies?: Record<string, string>): Response => {
    const res = { locals: {} } as Response;
    const next = jest.fn() as NextFunction;

    analyticsConsentMiddleware({ cookies } as Request, res, next);

    expect(next).toHaveBeenCalled();
    return res;
  };

  it('sets analyticsConsent when the preferences cookie has analytics on', () => {
    expect(run({ 'pcs-cookie-preferences': '{"analytics":"on","apm":"off"}' }).locals.analyticsConsent).toBe(true);
  });

  it('leaves analyticsConsent false without the cookie', () => {
    expect(run({}).locals.analyticsConsent).toBe(false);
    expect(run().locals.analyticsConsent).toBe(false);
  });
});
