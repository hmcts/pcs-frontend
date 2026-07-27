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

const mockGetPayload = jest.fn();
jest.mock('@services/cuiRa/cuiRaService', () => ({
  cuiRaService: { getPayload: mockGetPayload },
}));

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    if (key === 's2s.key') {
      return 's2s:service-token';
    }
    throw new Error(`Unexpected config key: ${key}`);
  }),
}));

const mockSafeRedirect303 = jest.fn();
jest.mock('@utils/safeRedirect', () => ({
  safeRedirect303: mockSafeRedirect303,
}));

import type { Application, Request, Response } from 'express';

import reasonableAdjustmentsCallbackRoutes from '../../../main/routes/reasonableAdjustmentsCallback';

const ROUTE = '/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id';
const confirmationUrl = '/case/123/respond-to-claim/reasonable-adjustments-confirmation';
const errorUrl = '/case/123/respond-to-claim/reasonable-adjustments-error';

describe('reasonableAdjustmentsCallback routes', () => {
  let mockAppGet: jest.Mock;

  const buildReq = (serviceToken: string | null): Request =>
    ({
      params: { caseReference: '123', id: 'abc-1' },
      app: { locals: { redisClient: { get: jest.fn().mockResolvedValue(serviceToken) } } },
    }) as unknown as Request;

  const getHandler = () => mockAppGet.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppGet = jest.fn();
    reasonableAdjustmentsCallbackRoutes({ get: mockAppGet } as unknown as Application);
  });

  it('registers the callback route with oidc middleware', () => {
    expect(mockAppGet).toHaveBeenCalledWith(ROUTE, mockOidcMiddleware, expect.any(Function));
  });

  it('redirects to the error page when no S2S service token is available', async () => {
    const res = {} as unknown as Response;

    await getHandler()(buildReq(null), res);

    expect(mockGetPayload).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });

  it('retrieves the payload and redirects to the confirmation page on success', async () => {
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '123' });
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockGetPayload).toHaveBeenCalledWith('abc-1', 's2s-tok');
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, confirmationUrl, '/case/123', ['/case']);
  });

  it('redirects to the error page when payload retrieval fails', async () => {
    mockGetPayload.mockRejectedValue(new Error('boom'));
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });
});
