import { NextFunction, Request, Response } from 'express';

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@hmcts/nodejs-logging', () => ({
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

    it('should return 404 when user has no access token', async () => {
      const validCaseRef = '1234567890123456';
      mockReq.session = {} as MockSession as Request['session'];

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Case not found or access denied',
      });
      expect(next).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('User not authenticated - no access token', {
        caseReference: validCaseRef,
      });
    });

    it('should return 404 when case is not found', async () => {
      const validCaseRef = '1234567890123456';
      const mockAccessToken = 'mock-access-token';

      mockReq.session = { user: { accessToken: mockAccessToken } } as MockSession as Request['session'];
      mockGetCaseById.mockRejectedValue(new Error('Case not found'));

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Case not found or access denied',
      });
      expect(next).not.toHaveBeenCalled();
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
    it('should return 404 error for case reference that is too short', () => {
      const shortCaseRef = '12345';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, shortCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference format',
      });
      expect(next).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid case reference format', {
        caseReference: shortCaseRef,
      });
    });

    it('should return 404 error for case reference that is too long', () => {
      const longCaseRef = '12345678901234567';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, longCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 error for case reference with non-numeric characters', () => {
      const invalidCaseRef = '123456789012345a';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, invalidCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 error for empty case reference', () => {
      const emptyCaseRef = '';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, emptyCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 error for case reference with special characters', () => {
      const specialCharCaseRef = '1234-5678-9012-34';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, specialCharCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 error for case reference with spaces', () => {
      const spacedCaseRef = '1234 5678 9012 3456';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, spacedCaseRef);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        error: 'Invalid case reference format',
      });
      expect(next).not.toHaveBeenCalled();
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
