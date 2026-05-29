const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockOidcMiddleware = jest.fn((req, res, next) => next());
jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: mockOidcMiddleware,
}));

const mockGetCardPaymentStatus = jest.fn();
jest.mock('../../../main/services/pcsApi/paymentService', () => ({
  paymentService: {
    getCardPaymentStatus: mockGetCardPaymentStatus,
  },
  getPaymentOutcome: jest.requireActual('../../../main/services/pcsApi/paymentService').getPaymentOutcome,
}));

import type { Application, Request, Response } from 'express';

import paymentReturnRoutes from '../../../main/routes/paymentReturn';

describe('paymentReturn routes', () => {
  let app: Application;
  let mockUse: jest.Mock;
  let mockRouterGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouterGet = jest.fn();
    mockUse = jest.fn();

    const mockRouter = {
      get: mockRouterGet,
    };

    jest.spyOn(require('express'), 'Router').mockReturnValue(mockRouter);

    app = {
      use: mockUse,
      get: jest.fn((path, ...handlers) => mockRouterGet(path, ...handlers)),
    } as unknown as Application;

    paymentReturnRoutes(app);
  });

  describe('GET /payment/return', () => {
    it('registers route with oidc middleware', () => {
      expect(mockRouterGet).toHaveBeenCalledWith('/payment/return', mockOidcMiddleware, expect.any(Function));
    });

    it('redirects home when payment reference is missing', async () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        session: {
          user: { accessToken: 'token-123' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/');
    });

    it('returns 401 when access token is missing', async () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        session: {
          payment: {
            paymentReference: 'RC-123',
            caseReference: '1234567890123456',
          },
        },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Authentication required' });
    });

    it('redirects to success URL and clears payment session on successful status', async () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockGetCardPaymentStatus.mockResolvedValue({ status: 'Success' });

      const req = {
        session: {
          user: { accessToken: 'token-123' },
          payment: {
            paymentReference: 'RC-123',
            caseReference: '1234567890123456',
            successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
            failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
          },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(mockGetCardPaymentStatus).toHaveBeenCalledWith('token-123', 'RC-123');
      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/payment-successful');
      expect(req.session.payment).toBeUndefined();
    });

    it('redirects to failure URL and clears payment session on failed status', async () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockGetCardPaymentStatus.mockResolvedValue({ status: 'Not paid' });

      const req = {
        session: {
          user: { accessToken: 'token-123' },
          payment: {
            paymentReference: 'RC-123',
            caseReference: '1234567890123456',
            failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
          },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/payment-failed');
      expect(req.session.payment).toBeUndefined();
    });

    it('redirects to pending URL and keeps session state on pending status', async () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockGetCardPaymentStatus.mockResolvedValue({ status: 'Created' });

      const req = {
        session: {
          user: { accessToken: 'token-123' },
          payment: {
            paymentReference: 'RC-123',
            caseReference: '1234567890123456',
            pendingRedirectUrl: '/payment/return',
            failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
          },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/payment/return');
      expect(req.session.payment).toBeDefined();
    });

    it('falls back to default case path when status check fails', async () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockGetCardPaymentStatus.mockRejectedValue(new Error('status lookup failed'));

      const req = {
        session: {
          user: { accessToken: 'token-123' },
          payment: {
            paymentReference: 'RC-123',
            caseReference: '1234567890123456',
          },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456');
    });
  });
});
