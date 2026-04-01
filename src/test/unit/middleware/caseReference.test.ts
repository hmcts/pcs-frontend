import { NextFunction, Request, Response } from 'express';

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

jest.mock('../../../main/utils/caseReference', () => ({
  sanitiseCaseReference: jest.fn((input: string | number) => {
    const str = String(input);
    // Only return valid if it's exactly 16 digits
    return /^\d{16}$/.test(str) ? str : null;
  }),
}));

const mockGetCaseById = jest.fn();

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: (...args: unknown[]) => mockGetCaseById(...args),
  },
}));

import { HTTPError } from '../../../main/HttpError';
import { caseReferenceParamMiddleware } from '../../../main/middleware/caseReference';

interface MockSession {
  user?: {
    accessToken?: string;
  };
}

describe('caseReferenceParamMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      session: {} as unknown as Request['session'],
      originalUrl: '/case/1234567890123456/some-page',
    };

    mockRes = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();
  });

  describe('valid case reference', () => {
    it('should set res.locals.validatedCase with valid 16-digit case reference', async () => {
      const validCaseRef = '1234567890123456';
      const mockCase = { id: validCaseRef, state: 'Open' };
      const mockAccessToken = 'mock-access-token';

      mockReq.session = { user: { accessToken: mockAccessToken } } as MockSession as Request['session'];
      mockGetCaseById.mockResolvedValue(mockCase);

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(mockGetCaseById).toHaveBeenCalledWith(mockAccessToken, validCaseRef);
      expect(mockRes.locals?.validatedCase).toEqual(mockCase);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() after successful validation', async () => {
      const validCaseRef = '9876543210987654';
      const mockCase = { id: validCaseRef, state: 'Open' };
      const mockAccessToken = 'mock-access-token';

      mockReq.session = { user: { accessToken: mockAccessToken } } as MockSession as Request['session'];
      mockGetCaseById.mockResolvedValue(mockCase);

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with 401 HTTPError when user has no access token', async () => {
      const validCaseRef = '1234567890123456';
      mockReq.session = {} as MockSession as Request['session'];

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('User not authenticated - no access token', {
        caseReference: validCaseRef,
      });
    });

    it('should call next with HTTPError when case is not found', async () => {
      const validCaseRef = '1234567890123456';
      const mockAccessToken = 'mock-access-token';

      mockReq.session = { user: { accessToken: mockAccessToken } } as MockSession as Request['session'];
      mockGetCaseById.mockRejectedValue(new Error('Case not found'));

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(500);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Case access validation failed',
        expect.objectContaining({
          caseReference: validCaseRef,
          error: 'Case not found',
        })
      );
    });
  });

  describe('invalid case reference', () => {
    it('should call next with 404 HTTPError for case reference that is too short', () => {
      const shortCaseRef = '12345';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, shortCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid case reference format', {
        caseReference: shortCaseRef,
      });
    });

    it('should call next with 404 HTTPError for case reference that is too long', () => {
      const longCaseRef = '12345678901234567';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, longCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with 404 HTTPError for case reference with non-numeric characters', () => {
      const invalidCaseRef = '123456789012345a';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, invalidCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with 404 HTTPError for empty case reference', () => {
      const emptyCaseRef = '';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, emptyCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with 404 HTTPError for case reference with special characters', () => {
      const specialCharCaseRef = '1234-5678-9012-34';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, specialCharCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with 404 HTTPError for case reference with spaces', () => {
      const spacedCaseRef = '1234 5678 9012 3456';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, spacedCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log error with invalid case reference', () => {
      const invalidCaseRef = 'invalid';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, invalidCaseRef);

      expect(mockLogger.error).toHaveBeenCalledWith('Invalid case reference format', {
        caseReference: invalidCaseRef,
      });
    });
  });
});
