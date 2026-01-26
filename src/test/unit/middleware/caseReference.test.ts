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

import { caseReferenceParamMiddleware } from '../../../main/middleware/caseReference';

describe('caseReferenceParamMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
    };

    mockRes = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();
  });

  describe('valid case reference', () => {
    it('should set res.locals.caseReference and req.params.caseReference with valid 16-digit case reference', () => {
      const validCaseRef = '1234567890123456';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(mockRes.locals?.caseReference).toBe(validCaseRef);
      expect(mockReq.params?.caseReference).toBe(validCaseRef);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() after successful validation', () => {
      const validCaseRef = '9876543210987654';

      caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
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
