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

const mockStartCardPaymentRequest = jest.fn();
jest.mock('../../../main/services/pcsApi/paymentService', () => ({
  paymentService: {
    startCardPaymentRequest: mockStartCardPaymentRequest,
  },
}));

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    if (key === 'payment.returnUrl') {
      return 'https://pcs.aat.platform.hmcts.net/payment/return';
    }

    throw new Error(`Unexpected config key: ${key}`);
  }),
}));

import type { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../../../main/HttpError';
import counterClaimPaymentStartRoutes from '../../../main/routes/counterClaimPaymentStart';

describe('counterClaimPaymentStart routes', () => {
  let app: Application;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet = jest.fn();
    app = {
      get: mockGet,
    } as unknown as Application;
    counterClaimPaymentStartRoutes(app);
  });

  it('registers route with oidc middleware', () => {
    expect(mockGet).toHaveBeenCalledWith(
      '/case/:caseReference/respond-to-claim/counter-claim-payment/start',
      mockOidcMiddleware,
      expect.any(Function)
    );
  });

  it('returns 401 via error middleware when access token is missing', async () => {
    const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response, next: NextFunction) => Promise<void>;
    const req = {
      params: { caseReference: '123' },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 404,
        },
      },
    } as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(new HTTPError('Authentication required', 401));
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirects to fee page when service request reference is missing', async () => {
    const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response, next: NextFunction) => Promise<void>;
    const req = {
      params: { caseReference: '123' },
      session: {
        user: { accessToken: 'token-1' },
        payment: {},
      },
    } as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await handler(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/counter-claim-application-fee-amount');
  });

  it('creates card payment and redirects to gov pay nextUrl', async () => {
    const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response, next: NextFunction) => Promise<void>;
    mockStartCardPaymentRequest.mockResolvedValue({
      paymentReference: 'RC-1',
      paymentStatus: 'Created',
      nextUrl: 'https://pay.example/next',
    });

    const req = {
      language: 'en',
      params: { caseReference: '123' },
      session: {
        user: { accessToken: 'token-1' },
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 404,
        },
      },
    } as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await handler(req, res, next);

    expect(mockStartCardPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'token-1',
        serviceRequestReference: 'SR-1',
        amount: 404,
        requestLanguage: 'en',
        returnUrl: 'https://pcs.aat.platform.hmcts.net/payment/return',
      })
    );
    expect(req.session.payment).toEqual(
      expect.objectContaining({
        paymentReference: 'RC-1',
      })
    );
    expect(res.redirect).toHaveBeenCalledWith(303, 'https://pay.example/next');
  });
});
