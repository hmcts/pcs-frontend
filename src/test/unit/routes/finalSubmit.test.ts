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
  res.locals.validatedCase = { id: req.params.caseReference, data: {} };
  next();
});
jest.mock('../../../main/middleware/caseReference', () => ({
  caseReferenceParamMiddleware: mockCaseReferenceParamMiddleware,
}));

const mockSubmitResponseToClaim = jest.fn();
jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    submitResponseToClaim: mockSubmitResponseToClaim,
  },
}));

import type { Application, Request, Response } from 'express';

import finalSubmitRoutes from '../../../main/routes/finalSubmit';

describe('finalSubmit routes', () => {
  let app: Application;
  let mockUse: jest.Mock;
  let mockRouterPost: jest.Mock;
  let mockRouterParam: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouterPost = jest.fn();
    mockRouterParam = jest.fn();
    mockUse = jest.fn();

    const mockRouter = {
      post: mockRouterPost,
      param: mockRouterParam,
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

    it('should submit via ccdCaseService and redirect to response-submitted confirmation', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockSubmitResponseToClaim.mockResolvedValue({});

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

      expect(mockSubmitResponseToClaim).toHaveBeenCalledWith('mock-token', validatedCase);
      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/response-submitted');
    });

    it('should redirect to check-your-answers with error when submission fails', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockSubmitResponseToClaim.mockRejectedValue(new Error('CCD connection failed'));

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
