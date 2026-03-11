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
  res.locals.validatedCase = { id: req.params.caseReference };
  next();
});
jest.mock('../../../main/middleware/caseReference', () => ({
  caseReferenceParamMiddleware: mockCaseReferenceParamMiddleware,
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
  let mockRouterGet: jest.Mock;
  let mockRouterPost: jest.Mock;
  let mockRouterParam: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouterGet = jest.fn();
    mockRouterPost = jest.fn();
    mockRouterParam = jest.fn();
    mockUse = jest.fn();

    const mockRouter = {
      get: mockRouterGet,
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

  describe('GET /:caseReference/final-submit', () => {
    it('should register GET route with oidc middleware', () => {
      expect(mockRouterGet).toHaveBeenCalledWith(
        '/:caseReference/final-submit',
        mockOidcMiddleware,
        expect.any(Function)
      );
    });

    it('should render final-submit form without error', () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456' },
        query: {},
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('finalSubmit', {
        caseId: '1234567890123456',
        error: undefined,
      });
    });

    it('should render final-submit form with failed error', () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456' },
        query: { error: 'failed' },
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('finalSubmit', {
        caseId: '1234567890123456',
        error: 'Failed to submit response. Please try again.',
      });
    });

    it('should render error when validatedCase is undefined', () => {
      const handler = mockRouterGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456' },
        query: {},
      } as unknown as Request;

      const res = {
        locals: {},
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error', {
        error: 'Internal server error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Final submit: validatedCase is undefined - middleware not executed'
      );
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
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Final submit POST: validatedCase is undefined - middleware not executed'
      );
    });

    it('should return 401 when no access token in session', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {},
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Authentication required' });
      expect(mockLogger.error).toHaveBeenCalledWith('No user access token in session for case 1234567890123456');
    });

    it('should successfully submit to CCD and redirect to confirmation', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockResolvedValue({
        data: { token: 'mock-event-token' },
      });

      mockHttpPost.mockResolvedValue({});

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(mockHttpGet).toHaveBeenCalledWith(
        expect.stringContaining('/cases/1234567890123456/event-triggers/respondPossessionClaim'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );

      expect(mockHttpPost).toHaveBeenCalledWith(
        expect.stringContaining('/cases/1234567890123456/events'),
        expect.objectContaining({
          data: {
            possessionClaimResponse: {},
          },
          event: {
            id: 'respondPossessionClaim',
            summary: 'Citizen respondPossessionClaim summary',
            description: 'Citizen respondPossessionClaim description',
          },
          event_token: 'mock-event-token',
          ignore_warning: false,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/confirmation');
      expect(mockLogger.info).toHaveBeenCalledWith('Submitting response to claim for case 1234567890123456');
      expect(mockLogger.info).toHaveBeenCalledWith('Response submitted successfully for case 1234567890123456');
    });

    it('should redirect with error when CCD submission fails', async () => {
      const handler = mockRouterPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockRejectedValue(new Error('CCD connection failed'));

      const req = {
        params: { caseReference: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/final-submit?error=failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to submit response for case 1234567890123456:',
        expect.any(Error)
      );
    });
  });

  describe('GET /:caseReference/confirmation', () => {
    it('should register confirmation GET route with oidc middleware', () => {
      expect(mockRouterGet).toHaveBeenCalledWith(
        '/:caseReference/confirmation',
        mockOidcMiddleware,
        expect.any(Function)
      );
    });

    it('should render confirmation page', () => {
      const handler = mockRouterGet.mock.calls[1][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456' },
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
        render: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('confirmation', {
        caseId: '1234567890123456',
      });
    });

    it('should render error when validatedCase is undefined', () => {
      const handler = mockRouterGet.mock.calls[1][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseReference: '1234567890123456' },
      } as unknown as Request;

      const res = {
        locals: {},
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error', {
        error: 'Internal server error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Confirmation: validatedCase is undefined - middleware not executed'
      );
    });
  });
});
