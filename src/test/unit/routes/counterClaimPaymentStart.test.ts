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

import type { Application, Request, Response } from 'express';

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

  it('redirects to fee page when service request reference is missing', async () => {
    const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;
    const req = {
      params: { caseReference: '123' },
      session: {
        user: { accessToken: 'token-1' },
        payment: {},
      },
    } as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/counter-claim-application-fee-amount');
  });

  it('creates card payment and redirects to gov pay nextUrl', async () => {
    const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;
    mockStartCardPaymentRequest.mockResolvedValue({
      paymentReference: 'RC-1',
      paymentStatus: 'Created',
      nextUrl: 'https://pay.example/next',
    });

    const req = {
      protocol: 'https',
      get: jest.fn().mockReturnValue('frontend.example'),
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

    await handler(req, res);

    expect(mockStartCardPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'token-1',
        serviceRequestReference: 'SR-1',
        amount: 404,
        requestLanguage: 'en',
        returnUrl: 'https://frontend.example/payment/return',
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
