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
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockPost = jest.fn();

    app = {
      get: mockGet,
      post: mockPost,
    } as unknown as Application;

    finalSubmitRoutes(app);
  });

  describe('GET /case/:caseId/final-submit', () => {
    it('should register GET route with oidc middleware', () => {
      expect(mockGet).toHaveBeenCalledWith('/case/:caseId/final-submit', mockOidcMiddleware, expect.any(Function));
    });

    it('should render final-submit form without error', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '1234567890123456' },
        query: {},
      } as unknown as Request;

      const res = {
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
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '1234567890123456' },
        query: { error: 'failed' },
      } as unknown as Request;

      const res = {
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('finalSubmit', {
        caseId: '1234567890123456',
        error: 'Failed to submit response. Please try again.',
      });
    });

    it('should render error when caseId is not 16 digits', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '123' },
        query: {},
      } as unknown as Request;

      const res = {
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid caseId format: 123');
    });

    it('should render error when caseId contains non-digits', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '../admin/1234567' },
        query: {},
      } as unknown as Request;

      const res = {
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid caseId format: ../admin/1234567');
    });
  });

  describe('POST /case/:caseId/final-submit', () => {
    it('should register POST route with oidc middleware', () => {
      expect(mockPost).toHaveBeenCalledWith('/case/:caseId/final-submit', mockOidcMiddleware, expect.any(Function));
    });

    it('should return 400 when caseId is invalid', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: 'invalid' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Invalid case reference' });
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid caseId format: invalid');
    });

    it('should return 401 when no access token in session', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        session: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Authentication required' });
      expect(mockLogger.error).toHaveBeenCalledWith('No user access token in session for case 1234567890123456');
    });

    it('should successfully submit to CCD and redirect to confirmation', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockResolvedValue({
        data: { token: 'mock-event-token' },
      });

      mockHttpPost.mockResolvedValue({});

      const req = {
        params: { caseId: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
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
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      mockHttpGet.mockRejectedValue(new Error('CCD connection failed'));

      const req = {
        params: { caseId: '1234567890123456' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
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

  describe('GET /case/:caseId/confirmation', () => {
    it('should register confirmation GET route with oidc middleware', () => {
      expect(mockGet).toHaveBeenCalledWith('/case/:caseId/confirmation', mockOidcMiddleware, expect.any(Function));
    });

    it('should render confirmation page', () => {
      const handler = mockGet.mock.calls[1][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '1234567890123456' },
      } as unknown as Request;

      const res = {
        render: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('confirmation', {
        caseId: '1234567890123456',
      });
    });
  });
});
