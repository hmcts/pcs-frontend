import type { Application, Request, Response } from 'express';

const mockRouterGet = jest.fn();
const mockRouterUse = jest.fn();

jest.mock('express', () => {
  const mockRouter = {
    use: mockRouterUse,
    get: mockRouterGet,
  };
  return {
    Router: jest.fn(() => mockRouter),
  };
});

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

import decentralisedEventRoutes from '@routes/decentralisedEvent';

describe('decentralisedEvent route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      use: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /:caseReference/event/:eventId with router and mount under /cases', () => {
    decentralisedEventRoutes(app);

    expect(app.use).toHaveBeenCalledWith('/cases', expect.anything());
    expect(mockRouterGet).toHaveBeenCalledWith('/:caseReference/event/:eventId', expect.any(Function));
  });

  describe('GET handler', () => {
    it('redirects to CUI respond to claim start page on successful sub check', () => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456', eventId: 'ext:respondPossessionClaim' },
        query: { expected_sub: 'user-sub' },
        session: { user: { sub: 'user-sub' } },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/start-now');
    });

    it('forces re-authentication (redirects to /login) on expected_sub mismatch', () => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456', eventId: 'ext:respondPossessionClaim' },
        query: { expected_sub: 'expected-user-sub' },
        session: { user: { sub: 'different-user-sub' } },
        originalUrl: '/cases/1234567890123456/event/ext:respondPossessionClaim?expected_sub=expected-user-sub',
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      const mockSessionSave = jest.fn(cb => cb());
      req.session.save = mockSessionSave;

      handler(req, res);

      expect(req.session.returnTo).toBe(req.originalUrl);
      expect(mockSessionSave).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('returns 404 if eventId is not supported', () => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456', eventId: 'ext:invalidEvent' },
        query: {},
        session: { user: {} },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not Found');
    });

    it('returns 404 if caseReference is invalid', () => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: 'invalid-ref', eventId: 'ext:respondPossessionClaim' },
        query: {},
        session: { user: {} },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not Found');
    });
  });
});
