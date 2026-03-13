import { csrfSync } from 'csrf-sync';
import { Express, NextFunction, Request, Response } from 'express';

import { Csrf } from '@modules/csrf';

jest.mock('csrf-sync', () => {
  const csrfSynchronisedProtection = jest.fn();
  return {
    csrfSync: jest.fn((options: { getTokenFromRequest: (req: Request) => string | undefined }) => ({
      csrfSynchronisedProtection,
      getTokenFromRequest: options?.getTokenFromRequest,
    })),
  };
});

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe('Csrf', () => {
  let csrf: Csrf;
  let mockApp: Express;
  let mockUse: jest.Mock;
  let loggerInfo: jest.Mock;

  beforeEach(() => {
    mockUse = jest.fn();
    mockApp = {
      use: mockUse,
    } as unknown as Express;

    csrf = new Csrf();
    loggerInfo = csrf.logger.info as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enableFor', () => {
    it('should log that CSRF protection is being enabled', () => {
      csrf.enableFor(mockApp);

      expect(loggerInfo).toHaveBeenCalledWith('Enabling CSRF protection');
    });

    it('should call csrfSync with getTokenFromRequest that reads _csrf from req.body or x-csrf-token header', () => {
      csrf.enableFor(mockApp);

      expect(csrfSync).toHaveBeenCalledTimes(1);
      const options = (csrfSync as jest.Mock).mock.calls[0][0];
      expect(options).toHaveProperty('getTokenFromRequest');
      expect(typeof options.getTokenFromRequest).toBe('function');

      const mockReq = { body: { _csrf: 'token-from-body' } } as Request;
      expect(options.getTokenFromRequest(mockReq)).toBe('token-from-body');

      const headerTokenReq = { body: {}, headers: { 'x-csrf-token': 'token-from-header' } } as unknown as Request;
      expect(options.getTokenFromRequest(headerTokenReq)).toBe('token-from-header');

      const reqNoToken = { body: {}, headers: {} } as unknown as Request;
      expect(options.getTokenFromRequest(reqNoToken)).toBeUndefined();
    });

    it('should register csrfSynchronisedProtection middleware via app.use', () => {
      csrf.enableFor(mockApp);

      const protectionMiddleware = (csrfSync as jest.Mock).mock.results[0].value.csrfSynchronisedProtection;
      expect(mockUse).toHaveBeenCalledWith(protectionMiddleware);
    });

    it('should register a second middleware that exposes csrfToken to res.locals', () => {
      csrf.enableFor(mockApp);

      expect(mockUse).toHaveBeenCalledTimes(2);
      const localsMiddleware = mockUse.mock.calls[1][0];
      expect(localsMiddleware).toEqual(expect.any(Function));
    });
  });

  describe('locals middleware (csrf token in views)', () => {
    it('should set res.locals.csrfToken when req.csrfToken is a function', () => {
      csrf.enableFor(mockApp);
      const localsMiddleware = mockUse.mock.calls[1][0] as (req: Request, res: Response, next: NextFunction) => void;

      const mockCsrfToken = jest.fn().mockReturnValue('generated-token');
      const req = { csrfToken: mockCsrfToken } as unknown as Request;
      const res = { locals: {} } as unknown as Response;
      const next = jest.fn();

      localsMiddleware(req, res, next);

      expect(mockCsrfToken).toHaveBeenCalled();
      expect(res.locals.csrfToken).toBe('generated-token');
      expect(next).toHaveBeenCalled();
    });

    it('should call next without setting csrfToken when req.csrfToken is not a function', () => {
      csrf.enableFor(mockApp);
      const localsMiddleware = mockUse.mock.calls[1][0] as (req: Request, res: Response, next: NextFunction) => void;

      const req = { csrfToken: undefined } as unknown as Request;
      const res = { locals: {} } as unknown as Response;
      const next = jest.fn();

      localsMiddleware(req, res, next);

      expect(res.locals).not.toHaveProperty('csrfToken');
      expect(next).toHaveBeenCalled();
    });

    it('should log and call next with the error when req.csrfToken throws', () => {
      csrf.enableFor(mockApp);
      const localsMiddleware = mockUse.mock.calls[1][0] as (req: Request, res: Response, next: NextFunction) => void;

      const error = new Error('csrf token failure');
      const req = {
        csrfToken: jest.fn(() => {
          throw error;
        }),
      } as unknown as Request;
      const res = { locals: {} } as unknown as Response;
      const next = jest.fn();

      localsMiddleware(req, res, next);

      expect(csrf.logger.error).toHaveBeenCalledWith('Error getting CSRF token', {
        error: 'csrf token failure',
      });
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next when req has no csrfToken property', () => {
      csrf.enableFor(mockApp);
      const localsMiddleware = mockUse.mock.calls[1][0] as (req: Request, res: Response, next: NextFunction) => void;

      const req = {} as Request;
      const res = { locals: {} } as unknown as Response;
      const next = jest.fn();

      localsMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
