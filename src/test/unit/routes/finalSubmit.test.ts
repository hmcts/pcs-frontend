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

const mockCaseReferenceParamMiddleware = jest.fn((req, res, next) => {
  next();
});
jest.mock('../../../main/middleware/caseReference', () => ({
  caseReferenceParamMiddleware: mockCaseReferenceParamMiddleware,
}));

const mockRequireEventAccessHandler = jest.fn((req, res, next) => {
  res.locals.validatedCase = { id: req.params.caseReference };
  next();
});
const mockRequireEventAccess = jest.fn(() => mockRequireEventAccessHandler);
jest.mock('../../../main/middleware/requireEventAccess', () => ({
  requireEventAccess: mockRequireEventAccess,
}));

const mockHttpGet = jest.fn();
const mockHttpPost = jest.fn();
jest.mock('../../../main/modules/http', () => ({
  http: {
    get: mockHttpGet,
    post: mockHttpPost,
  },
}));

import type { Application, Request, Response } from 'express';

import finalSubmitRoutes from '../../../main/routes/finalSubmit';

describe('finalSubmit routes', () => {
  let app: Application;
  let mockUse: jest.Mock;
  let mockRouterPost: jest.Mock;
  let mockRouterParam: jest.Mock;
  let mockRouterUse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouterPost = jest.fn();
    mockRouterParam = jest.fn();
    mockRouterUse = jest.fn();
    mockUse = jest.fn();

    const mockRouter = {
      post: mockRouterPost,
      param: mockRouterParam,
      use: mockRouterUse,
    };

    jest.spyOn(require('express'), 'Router').mockReturnValue(mockRouter);

    app = {
      use: mockUse,
    } as unknown as Application;

    finalSubmitRoutes(app);
  });

  describe('Router setup', () => {
    it('should register param middleware for caseReference', () => {
      expect(mockRouterParam).toHaveBeenCalledWith('caseReference', mockCaseReferenceParamMiddleware);
    });

    it('should apply requireEventAccess(respondPossessionClaim) only on final-submit', () => {
      expect(mockRequireEventAccess).toHaveBeenCalledWith('respondPossessionClaim');
      expect(mockRouterUse).toHaveBeenCalledWith(['/:caseReference/final-submit'], mockRequireEventAccessHandler);
    });

    it('should mount router under /case path', () => {
      expect(mockUse).toHaveBeenCalledWith('/case', expect.anything());
    });
  });

  describe('POST /:caseReference/final-submit', () => {
    it('should register POST route with oidc middleware', () => {
      expect(mockRouterPost).toHaveBeenCalledWith(
        '/:caseReference/final-submit',
        mockOidcMiddleware,
        expect.any(Function)
      );
    });

    it('should return 500 when validatedCase is undefined', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: {},
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Internal server error' });
    });

    it('should return 401 when no access token in session', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {},
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456', data: {} } },
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Authentication required' });
    });

    it('should submit to CCD and redirect to response-submitted confirmation', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockResolvedValue({
        data: { token: 'mock-event-token' },
      });

      mockHttpPost.mockResolvedValue({ data: {} });

      const validatedCase = {
        id: '1234567890123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { makeCounterClaim: 'NO' },
          },
        },
      };

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: { validatedCase },
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(mockHttpGet).toHaveBeenCalled();
      expect(mockHttpPost).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/response-submitted');
    });

    it('stores submit-time payment data in session for counterclaim payment-needed path', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockResolvedValue({
        data: { token: 'mock-event-token' },
      });

      mockHttpPost.mockResolvedValue({
        data: {
          after_submit_callback_response: {
            confirmation_body: JSON.stringify({
              state: 'PENDING_COUNTER_CLAIM_ISSUED',
              serviceRequestReference: 'SR-123',
              feeAmount: 404,
            }),
          },
        },
      });

      const validatedCase = {
        id: '1234567890123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { makeCounterClaim: 'YES', counterClaim: { hwfReferenceNumber: '' } },
          },
        },
      };

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: { validatedCase },
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(req.session.payment).toEqual(
        expect.objectContaining({
          caseReference: '1234567890123456',
          serviceRequestReference: 'SR-123',
          feeAmount: 404,
        })
      );
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        '/case/1234567890123456/respond-to-claim/response-submitted-counter-claim-fee-payment-needed'
      );
    });

    it('stores submit-time payment data when confirmation body nests counterClaim payload', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockResolvedValue({
        data: { token: 'mock-event-token' },
      });

      mockHttpPost.mockResolvedValue({
        data: {
          after_submit_callback_response: {
            confirmation_body: JSON.stringify({
              counterClaim: {
                status: 'PENDING_COUNTER_CLAIM_ISSUED',
                serviceRequestReference: 'SR-456',
                feeAmount: 303,
              },
            }),
          },
        },
      });

      const validatedCase = {
        id: '1234567890123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { makeCounterClaim: 'NO' },
          },
        },
      };

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: { validatedCase },
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(req.session.payment).toEqual(
        expect.objectContaining({
          caseReference: '1234567890123456',
          serviceRequestReference: 'SR-456',
          feeAmount: 303,
        })
      );
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        '/case/1234567890123456/respond-to-claim/response-submitted-counter-claim-fee-payment-needed'
      );
    });

    it('should redirect to check-your-answers with error when submission fails', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockResolvedValue({ data: { token: 'mock-event-token' } });
      mockHttpPost.mockRejectedValue(new Error('CCD connection failed'));

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456', data: {} } },
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        303,
        '/case/1234567890123456/respond-to-claim/check-your-answers?submitError=failed'
      );
    });
  });
});
