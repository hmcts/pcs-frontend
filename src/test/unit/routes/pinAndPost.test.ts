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

const mockValidateAccessCodeDetailed = jest.fn();
jest.mock('@services/pcsApi/pcsApiService', () => ({
  validateAccessCodeDetailed: mockValidateAccessCodeDetailed,
}));

const mockSafeRedirect303 = jest.fn();
jest.mock('@utils/safeRedirect', () => ({
  safeRedirect303: mockSafeRedirect303,
}));

import type { Application, Request, Response } from 'express';

import pinAndPostRoutes from '@routes/pinAndPost';

describe('pinAndPost routes', () => {
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

    pinAndPostRoutes(app);
  });

  describe('GET /access-your-case', () => {
    it('should render the form when no validatedCaseId in session', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = { session: {} } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      handler(req, res);

      expect(res.render).toHaveBeenCalledWith('pinAndPost', {
        errors: {},
        errorList: [],
        claimNumber: '',
        accessCode: '',
      });
    });

    it('should redirect to dashboard when validatedCaseId exists in session', () => {
      const handler = mockGet.mock.calls[0][2] as (req: Request, res: Response) => void;

      const req = { session: { validatedCaseId: '1234567890123456' } } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      handler(req, res);

      expect(mockSafeRedirect303).toHaveBeenCalledWith(res, '/dashboard/1234567890123456', '/', ['/dashboard']);
    });
  });

  describe('POST /access-your-case', () => {
    it('should return 401 when no access token in session', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234567890123456', accessCode: 'ABCD12345678' },
        session: {},
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.render).toHaveBeenCalledWith('error', { error: 'Authentication required' });
    });

    it('should show error when claim number is missing', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '', accessCode: 'ABCD12345678' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'pinAndPost',
        expect.objectContaining({ errors: expect.objectContaining({ claimNumber: expect.any(Object) }) })
      );
    });

    it('should show error when access code is missing', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234567890123456', accessCode: '' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'pinAndPost',
        expect.objectContaining({ errors: expect.objectContaining({ accessCode: expect.any(Object) }) })
      );
    });

    it('should show error when access code length is wrong', async () => {
      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234567890123456', accessCode: 'ABCD' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'pinAndPost',
        expect.objectContaining({
          errors: expect.objectContaining({ accessCode: { text: 'Access code must be 12 characters' } }),
        })
      );
    });

    it('should redirect to dashboard on successful validation', async () => {
      mockValidateAccessCodeDetailed.mockResolvedValueOnce({ valid: true });

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234567890123456', accessCode: 'ABCD12345678' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockSafeRedirect303).toHaveBeenCalledWith(res, '/dashboard/1234567890123456', '/', ['/dashboard']);
    });

    it('should strip hyphens from claim number before validating', async () => {
      mockValidateAccessCodeDetailed.mockResolvedValueOnce({ valid: true });

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234-5678-9012-3456', accessCode: 'ABCD12345678' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockValidateAccessCodeDetailed).toHaveBeenCalledWith('mock-token', '1234567890123456', 'ABCD12345678');
    });

    it('should show field error on validation failure', async () => {
      mockValidateAccessCodeDetailed.mockResolvedValueOnce({ valid: false, error: 'mismatch' });

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234567890123456', accessCode: 'ABCD12345678' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'pinAndPost',
        expect.objectContaining({ errors: expect.objectContaining({ accessCode: expect.any(Object) }) })
      );
    });

    it('should show error when validation throws', async () => {
      mockValidateAccessCodeDetailed.mockRejectedValueOnce(new Error('Network error'));

      const handler = mockPost.mock.calls[0][2] as (req: Request, res: Response) => Promise<void>;

      const req = {
        body: { claimNumber: '1234567890123456', accessCode: 'ABCD12345678' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;
      const res = { render: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'pinAndPost',
        expect.objectContaining({ errors: expect.objectContaining({ accessCode: expect.any(Object) }) })
      );
    });
  });
});
