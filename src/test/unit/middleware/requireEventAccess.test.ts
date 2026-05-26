import { NextFunction, Request, Response } from 'express';

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockGetCaseByIdForEvent = jest.fn();

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseByIdForEvent: (...args: unknown[]) => mockGetCaseByIdForEvent(...args),
  },
}));

import { HTTPError } from '../../../main/HttpError';
import { requireEventAccess } from '../../../main/middleware/requireEventAccess';

import { CcdCaseModel } from '@services/ccdCaseData.model';

interface MockSession {
  user?: {
    accessToken?: string;
  };
}

describe('requireEventAccess', () => {
  const eventId = 'respondPossessionClaim';
  const validCaseRef = '1234567890123456';
  const mockAccessToken = 'mock-access-token';
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: { caseReference: validCaseRef },
      session: { user: { accessToken: mockAccessToken } } as MockSession as Request['session'],
      originalUrl: `/case/${validCaseRef}/respond-to-claim/start-now`,
    };

    mockRes = {
      locals: {},
    };

    next = jest.fn();
  });

  describe('successful access', () => {
    it('should hydrate res.locals.validatedCase and call next()', async () => {
      const mockCase = { id: validCaseRef, data: {} };
      mockGetCaseByIdForEvent.mockResolvedValue(mockCase);

      const middleware = requireEventAccess(eventId);
      await middleware(mockReq as Request, mockRes as Response, next);

      expect(mockGetCaseByIdForEvent).toHaveBeenCalledWith(mockAccessToken, validCaseRef, eventId);
      expect(mockRes.locals?.validatedCase).toBeInstanceOf(CcdCaseModel);
      expect((mockRes.locals?.validatedCase as CcdCaseModel).id).toBe(validCaseRef);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should pass the provided eventId through to getCaseByIdForEvent', async () => {
      const mockCase = { id: validCaseRef, data: {} };
      mockGetCaseByIdForEvent.mockResolvedValue(mockCase);

      const middleware = requireEventAccess('citizenCreateGenApp');
      await middleware(mockReq as Request, mockRes as Response, next);

      expect(mockGetCaseByIdForEvent).toHaveBeenCalledWith(mockAccessToken, validCaseRef, 'citizenCreateGenApp');
    });
  });

  describe('missing case reference', () => {
    it('should call next with 404 HTTPError when caseReference param is missing', async () => {
      mockReq.params = {};

      const middleware = requireEventAccess(eventId);
      await middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(404);
      expect(error.message).toBe('Invalid case reference format');
      expect(mockGetCaseByIdForEvent).not.toHaveBeenCalled();
    });
  });

  describe('missing access token', () => {
    it('should call next with 401 HTTPError when user has no access token', async () => {
      mockReq.session = {} as MockSession as Request['session'];

      const middleware = requireEventAccess(eventId);
      await middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required');
      expect(mockGetCaseByIdForEvent).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('User not authenticated - no access token', {
        caseReference: validCaseRef,
      });
    });
  });

  describe('error handling', () => {
    it('should preserve HTTPError status when getCaseById throws an HTTPError', async () => {
      mockGetCaseByIdForEvent.mockRejectedValue(new HTTPError('Forbidden', 403));

      const middleware = requireEventAccess(eventId);
      await middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('should wrap generic errors in a 500 HTTPError', async () => {
      mockGetCaseByIdForEvent.mockRejectedValue(new Error('boom'));

      const middleware = requireEventAccess(eventId);
      await middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      const error = (next as jest.Mock).mock.calls[0][0] as HTTPError;
      expect(error.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Case access validation failed',
        expect.objectContaining({
          caseReference: validCaseRef,
          eventId,
          error: 'boom',
        })
      );
    });
  });
});
