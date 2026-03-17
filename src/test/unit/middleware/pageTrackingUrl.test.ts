import type { NextFunction, Request, Response } from 'express';

import { pageTrackingUrlMiddleware } from '../../../main/middleware/pageTrackingUrl';

describe('pageTrackingUrlMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    res = {
      locals: {},
    };
    next = jest.fn();
  });

  it('should set dashboard as the tracking URL for dashboard routes', () => {
    req = {
      path: '/dashboard/active',
    };

    pageTrackingUrlMiddleware(req as Request, res as Response, next);

    expect(res.locals?.pageTrackingUrl).toBe('dashboard');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should strip the case id from case routes', () => {
    req = {
      path: '/case/1234567890123456/respond-to-claim/start-now',
    };

    pageTrackingUrlMiddleware(req as Request, res as Response, next);

    expect(res.locals?.pageTrackingUrl).toBe('respond-to-claim/start-now');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should leave non-dashboard and non-case routes unchanged', () => {
    req = {
      path: '/contact-us',
    };

    pageTrackingUrlMiddleware(req as Request, res as Response, next);

    expect(res.locals?.pageTrackingUrl).toBe('/contact-us');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should leave short case routes unchanged', () => {
    req = {
      path: '/case/1234567890123456',
    };

    pageTrackingUrlMiddleware(req as Request, res as Response, next);

    expect(res.locals?.pageTrackingUrl).toBe('/case/1234567890123456');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
