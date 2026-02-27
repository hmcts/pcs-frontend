/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import { HTTPError } from '../../../../main/HttpError';

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

import { createErrorHandler, createNotFoundHandler, setupErrorHandlers } from '../../../../main/modules/error-handler';
import { authFailure } from '../../../../main/modules/error-handler/authFailure';

describe('error-handler', () => {
  let app: Express;

  const createMockTranslation = () => {
    const translations: Record<string, string> = {
      'errorPages.403.title': 'Not Authorised',
      'errorPages.403.paragraph': 'Sorry you do not have access to this account.',
      'errorPages.404.title': 'Page not found',
      'errorPages.404.paragraph': "This could be because you've followed a broken or outdated link.",
      'errorPages.500.title': "Sorry, we're having technical problems",
      'errorPages.500.paragraph': 'Please try again in a few minutes.',
      serviceName: 'Possession claims',
      phase: 'ALPHA',
      feedback: 'Feedback text',
      languageToggle: 'Language toggle',
      back: 'Back',
    };
    return (key: string) => translations[key] || key;
  };

  beforeEach(() => {
    app = express();
    app.set('view engine', 'njk');
    app.set('views', 'src/main/views');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authFailure', () => {
    it('should redirect to login and clear session when 401 HTTPError', () => {
      const err = new HTTPError('Unauthorised', 401);
      const req = {
        originalUrl: '/dashboard',
        session: {
          returnTo: undefined as string | undefined,
          user: { uid: 'user-123' },
          ccdCase: { id: 'case-1' },
          codeVerifier: 'verifier',
          nonce: 'nonce',
        },
      } as any;
      const res = {
        headersSent: false,
        writableEnded: false,
        redirect: jest.fn(),
      } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(mockLogger.info).toHaveBeenCalledWith('Redirecting to login due to invalid session', {
        event: 'redirect_to_login',
        reason: 'invalid_session',
        path: '/dashboard',
        userId: 'user-123',
      });
      expect(req.session.returnTo).toBe('/dashboard');
      expect(req.session.user).toBeUndefined();
      expect(req.session.ccdCase).toBeUndefined();
      expect(req.session.codeVerifier).toBeUndefined();
      expect(req.session.nonce).toBeUndefined();
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass non-401 HTTPError to next', () => {
      const err = new HTTPError('Forbidden', 403);
      const req = {} as any;
      const res = { headersSent: false, writableEnded: false } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should pass non-HTTPError to next', () => {
      const err = new Error('Generic error');
      const req = {} as any;
      const res = { headersSent: false, writableEnded: false } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should pass to next when headers already sent', () => {
      const err = new HTTPError('Unauthorised', 401);
      const req = {} as any;
      const res = { headersSent: true, writableEnded: false, redirect: jest.fn() } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should pass to next when response writableEnded', () => {
      const err = new HTTPError('Unauthorised', 401);
      const req = {} as any;
      const res = { headersSent: false, writableEnded: true, redirect: jest.fn() } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect when no session exists', () => {
      const err = new HTTPError('Unauthorised', 401);
      const req = { originalUrl: '/some-path', session: undefined } as any;
      const res = {
        headersSent: false,
        writableEnded: false,
        redirect: jest.fn(),
      } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(mockLogger.info).toHaveBeenCalledWith('Redirecting to login due to invalid session', {
        event: 'redirect_to_login',
        reason: 'invalid_session',
        path: '/some-path',
        userId: undefined,
      });
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect when session has no user', () => {
      const err = new HTTPError('Unauthorised', 401);
      const req = {
        originalUrl: '/dashboard',
        session: { returnTo: undefined as string | undefined },
      } as any;
      const res = {
        headersSent: false,
        writableEnded: false,
        redirect: jest.fn(),
      } as any;
      const next = jest.fn() as NextFunction;

      authFailure(err, req, res, next);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Redirecting to login due to invalid session',
        expect.objectContaining({ userId: undefined })
      );
      expect(req.session.returnTo).toBe('/dashboard');
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });
  });

  describe('setupErrorHandlers', () => {
    it('should register error handlers without throwing', () => {
      expect(() => setupErrorHandlers(app, 'test')).not.toThrow();
    });

    it('should handle HTTPError with status 403', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Not authorised', 403);
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('error');
      expect(res.locals.errorTitle).toBe('Not Authorised');
      expect(res.locals.errorParagraph).toBe('Sorry you do not have access to this account.');
    });

    it('should handle HTTPError with status 404', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Page not found', 404);
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('error');
      expect(res.locals.errorTitle).toBe('Page not found');
    });

    it('should handle HTTPError with status 500', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Internal server error', 500);
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error');
      expect(res.locals.errorTitle).toBe("Sorry, we're having technical problems");
      expect(res.locals.errorParagraph).toBe('Please try again in a few minutes.');
    });

    it('should convert non-HTTPError to HTTPError with status 500', () => {
      const errorHandler = createErrorHandler('test');
      const err = new Error('Generic error');
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('error');
      expect(res.locals.errorTitle).toBe("Sorry, we're having technical problems");
    });

    it('should use fallback message when error has no message', () => {
      const errorHandler = createErrorHandler('test');
      const err = new Error();
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.locals.message).toBe('Internal server error');
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should expose error details when env is development', () => {
      const errorHandler = createErrorHandler('development');
      const err = new HTTPError('Test error', 500);
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.locals.error).toEqual(err);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should set template variables for stepsTemplate', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Test error', 500);
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.locals.serviceName).toBe('Possession claims');
      expect(res.locals.phase).toBe('ALPHA');
      expect(res.locals.feedback).toBe('Feedback text');
      expect(res.locals.languageToggle).toBe('Language toggle');
      expect(res.locals.back).toBe('Back');
    });

    it('should not render if headers are already sent', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Test error', 500);
      const req = {} as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: {},
        headersSent: true,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.render).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });

    it('should pass to next when response writableEnded', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Test error', 500);
      const req = {} as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: {},
        headersSent: false,
        writableEnded: true,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.render).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });

    it('should pass to next when response is finished', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Test error', 500);
      const req = {} as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: {},
        headersSent: false,
        writableEnded: false,
        finished: true,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.render).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });

    it('should skip logging for 404 on /.well-known/ URLs', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Page not found', 404);
      const req = {
        originalUrl: '/.well-known/openid-configuration',
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('error');
    });

    it('should skip logging for 404 on favicon.ico requests', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Page not found', 404);
      const req = {
        originalUrl: '/favicon.ico',
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('error');
    });

    it('should handle 400 status as 403 error message', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Bad request', 400);
      const req = {
        i18n: { getFixedT: () => createMockTranslation() },
        language: 'en',
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: { t: createMockTranslation() },
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.locals.errorTitle).toBe('Not Authorised');
    });

    it('should use fallback translation function if i18n is not available', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Test error', 500);
      const req = {} as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: {},
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.render).toHaveBeenCalledWith('error');
      expect(res.locals.errorTitle).toBe('errorPages.500.title');
    });

    it('should log error', () => {
      const errorHandler = createErrorHandler('test');
      const err = new HTTPError('Test error', 500);
      err.stack = 'Error stack trace';
      const req = {} as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: {},
        headersSent: false,
      } as any;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error stack trace'));
    });

    it('should create 404 error for unmatched routes', () => {
      const notFoundHandler = createNotFoundHandler();
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn();

      notFoundHandler(req, res, next as NextFunction);

      expect(next).toHaveBeenCalledWith(expect.any(HTTPError));
      expect((next.mock.calls[0][0] as HTTPError).status).toBe(404);
      expect((next.mock.calls[0][0] as HTTPError).message).toBe('Page not found');
    });

    it('should not create 404 error if headers are already sent', () => {
      const notFoundHandler = createNotFoundHandler();
      const req = {} as Request;
      const res = { headersSent: true } as Response;
      const next = jest.fn();

      notFoundHandler(req, res, next as NextFunction);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(HTTPError));
    });

    it('should not create 404 error if response is writableEnded', () => {
      const notFoundHandler = createNotFoundHandler();
      const req = {} as Request;
      const res = { writableEnded: true } as Response & { writableEnded?: boolean };
      const next = jest.fn();

      notFoundHandler(req, res, next as NextFunction);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(HTTPError));
    });
  });
});
