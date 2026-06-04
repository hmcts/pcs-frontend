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

jest.mock('@utils/caseReference', () => ({
  sanitiseCaseReference: jest.fn((input: string | number) => {
    const str = String(input);
    return /^\d{16}$/.test(str) ? str : null;
  }),
}));

import { HTTPError } from '../../../main/HttpError';
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
    it('should call next() with no error and set sanitised case reference on req.params', async () => {
      const validCaseRef = '1234567890123456';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, validCaseRef);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(mockReq.params?.caseReference).toBe(validCaseRef);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('invalid case reference', () => {
    it('should call next with 404 HTTPError for case reference that is too short', async () => {
      const shortCaseRef = '12345';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, shortCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid case reference format', {
        caseReference: shortCaseRef,
      });
    });

    it('should call next with 404 HTTPError for case reference that is too long', async () => {
      const longCaseRef = '12345678901234567';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, longCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
    });

    it('should call next with 404 HTTPError for case reference with non-numeric characters', async () => {
      const invalidCaseRef = '123456789012345a';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, invalidCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
    });

    it('should call next with 404 HTTPError for empty case reference', async () => {
      const emptyCaseRef = '';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, emptyCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
    });

    it('should call next with 404 HTTPError for case reference with special characters', async () => {
      const specialCharCaseRef = '1234-5678-9012-34';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, specialCharCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
    });

    it('should call next with 404 HTTPError for case reference with spaces', async () => {
      const spacedCaseRef = '1234 5678 9012 3456';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, spacedCaseRef);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
    });
  });

  describe('logging', () => {
    it('should log error with invalid case reference', async () => {
      const invalidCaseRef = 'invalid';

      await caseReferenceParamMiddleware(mockReq as Request, mockRes as Response, next, invalidCaseRef);

      expect(mockLogger.error).toHaveBeenCalledWith('Invalid case reference format', {
        caseReference: invalidCaseRef,
      });
    });
  });
});
