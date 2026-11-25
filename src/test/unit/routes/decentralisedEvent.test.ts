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

  it('should apply oidcMiddleware to the router', () => {
    decentralisedEventRoutes(app);

    expect(mockRouterUse).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('GET handler', () => {
    it.each([
      ['sub', { sub: 'user-sub' }],
      ['uid', { uid: 'user-sub' }],
      ['id', { id: 'user-sub' }],
      ['email', { email: 'user-sub' }],
    ])('redirects to CUI start page when expected_sub matches user %s', (_, userObj) => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456', eventId: 'ext:respondPossessionClaim' },
        query: { expected_sub: 'user-sub' },
        session: { user: userObj },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/start-now');
    });

    function launch(eventId: string, query: Record<string, unknown>) {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;
      const req = {
        params: { caseReference: '1234567890123456', eventId },
        query: { expected_sub: 'user-sub', ...query },
        session: { user: { sub: 'user-sub' } },
      } as unknown as Request;
      const res = { redirect: jest.fn() } as unknown as Response;
      handler(req, res);
      return res.redirect;
    }

    it.each([
      ['ext:makeOrder', '/case/1234567890123456/make-order'],
      ['ext:confirmOrderReview', '/case/1234567890123456/confirm-order-review'],
    ])('hands an order page the order and task XUI gave %s, and nothing else', (eventId, route) => {
      const redirect = launch(eventId, {
        orderId: 'order-1',
        taskId: 'a1b2c3d4-0000-4000-8000-000000000000',
        lang: 'cy',
      });

      expect(redirect).toHaveBeenCalledWith(
        303,
        `${route}?orderId=order-1&taskId=a1b2c3d4-0000-4000-8000-000000000000`
      );
    });

    it("hands the make order page the hearing a judge's task names", () => {
      const redirect = launch('ext:makeOrder', { hearingId: '10000010', taskId: 'task-1' });

      expect(redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/make-order?taskId=task-1&hearingId=10000010');
    });

    it.each(['a%26lang%3Dcy', 'a#tail', 'a\nb', 'a&lang=cy', ''])(
      'does not hand an order page an id that is not one (%j)',
      orderId => {
        const redirect = launch('ext:confirmOrderReview', { orderId });

        expect(redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/confirm-order-review');
      }
    );

    it('hands other pages no query', () => {
      const redirect = launch('ext:respondPossessionClaim', { orderId: 'order-1', lang: 'cy', cyaReturn: 'true' });

      expect(redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/start-now');
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

      handler(req, res);

      expect(req.session.returnTo).toBe(req.originalUrl);
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('deletes auth session keys and preserves pre-existing returnTo URL on user mismatch', () => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const session = {
        user: { sub: 'different-user-sub' },
        ccdCase: { id: '12345' },
        codeVerifier: 'verifier123',
        nonce: 'nonce123',
        returnTo: '/existing-return-page',
      };

      const req = {
        params: { caseReference: '1234567890123456', eventId: 'ext:respondPossessionClaim' },
        query: { expected_sub: 'expected-user-sub' },
        session,
        originalUrl: '/cases/1234567890123456/event/ext:respondPossessionClaim?expected_sub=expected-user-sub',
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(session.returnTo).toBe('/existing-return-page');
      expect(session.user).toBeUndefined();
      expect(session.ccdCase).toBeUndefined();
      expect(session.codeVerifier).toBeUndefined();
      expect(session.nonce).toBeUndefined();
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('returns 404 Bad Request if expected_sub query parameter is missing or not a string', () => {
      decentralisedEventRoutes(app);
      const handler = mockRouterGet.mock.calls[0][1] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456', eventId: 'ext:respondPossessionClaim' },
        query: {},
        session: { user: { sub: 'user-sub' } },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not found');
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
