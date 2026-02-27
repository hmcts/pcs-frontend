const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockOidcMiddleware = jest.fn((req, res, next) => next());
jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: mockOidcMiddleware,
}));

const mockValidateAccessCode = jest.fn();
jest.mock('../../../main/services/pcsApi/pcsApiService', () => ({
  validateAccessCode: mockValidateAccessCode,
}));

import type { Application, Request, Response } from 'express';

import accessCodeRoutes from '../../../main/routes/accessCode';

describe('accessCode routes', () => {
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

    accessCodeRoutes(app);
  });

  describe('GET /case/:caseId/access-code', () => {
    it('should register GET route with oidc middleware', () => {
      expect(mockGet).toHaveBeenCalledWith('/case/:caseId/access-code', mockOidcMiddleware, expect.any(Function));
    });

    it('should render access code form without error', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '1234567890123456' },
        query: {},
      } as unknown as Request;

      const res = {
        render: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('accessCode', {
        caseId: '1234567890123456',
        error: undefined,
      });
    });

    it('should render access code form with invalid error', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '1234567890123456' },
        query: { error: 'invalid' },
      } as unknown as Request;

      const res = {
        render: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('accessCode', {
        caseId: '1234567890123456',
        error: 'Invalid access code. Please try again.',
      });
    });

    it('should render access code form without error for non-invalid error query', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = {
        params: { caseId: '1234567890123456' },
        query: { error: 'something-else' },
      } as unknown as Request;

      const res = {
        render: jest.fn(),
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('accessCode', {
        caseId: '1234567890123456',
        error: undefined,
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
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('accessCode', {
        caseId: '123',
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
      } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('accessCode', {
        caseId: '../admin/1234567',
        error: 'Invalid case reference',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid caseId format: ../admin/1234567');
    });
  });

  describe('POST /case/:caseId/access-code', () => {
    it('should register POST route with oidc middleware', () => {
      expect(mockPost).toHaveBeenCalledWith('/case/:caseId/access-code', mockOidcMiddleware, expect.any(Function));
    });

    it('should return 401 when no access token in session', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: 'ABC123' },
        session: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Authentication required' });
      expect(mockLogger.error).toHaveBeenCalledWith('No user access token in session for case 1234567890123456');
    });

    it('should redirect with error when access code is missing', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: {},
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/access-code?error=invalid');
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing access code for case 1234567890123456');
    });

    it('should redirect with error when access code is not a string', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: ['ABC123'] },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/access-code?error=invalid');
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing access code for case 1234567890123456');
    });

    it('should redirect with error when access code is empty string', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: '   ' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/access-code?error=invalid');
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing access code for case 1234567890123456');
    });

    it('should redirect to start-now when access code is valid', async () => {
      mockValidateAccessCode.mockResolvedValueOnce(true);

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: 'ABC123' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(mockValidateAccessCode).toHaveBeenCalledWith('mock-token', '1234567890123456', 'ABC123');
      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/start-now');
      expect(mockLogger.info).toHaveBeenCalledWith('Access code validated successfully for case 1234567890123456');
    });

    it('should trim whitespace from access code', async () => {
      mockValidateAccessCode.mockResolvedValueOnce(true);

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: '  ABC123  ' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(mockValidateAccessCode).toHaveBeenCalledWith('mock-token', '1234567890123456', 'ABC123');
    });

    it('should redirect with error when access code is invalid', async () => {
      mockValidateAccessCode.mockResolvedValueOnce(false);

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: 'WRONG123' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(mockValidateAccessCode).toHaveBeenCalledWith('mock-token', '1234567890123456', 'WRONG123');
      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/access-code?error=invalid');
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid access code provided for case 1234567890123456');
    });

    it('should redirect with error when validation throws error', async () => {
      mockValidateAccessCode.mockRejectedValueOnce(new Error('API error'));

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '1234567890123456' },
        body: { accessCode: 'ABC123' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/access-code?error=invalid');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to validate access code for case 1234567890123456:',
        expect.any(Error)
      );
    });

    it('should redirect with error when caseId is not 16 digits', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '123' },
        body: { accessCode: 'ABC123' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/access-code?error=invalid');
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid caseId format: 123');
      expect(mockValidateAccessCode).not.toHaveBeenCalled();
    });

    it('should redirect with error when caseId contains path traversal', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        params: { caseId: '../admin/1234567' },
        body: { accessCode: 'ABC123' },
        session: {
          user: { accessToken: 'mock-token' },
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, '/case/../admin/1234567/access-code?error=invalid');
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid caseId format: ../admin/1234567');
      expect(mockValidateAccessCode).not.toHaveBeenCalled();
    });
  });
});
