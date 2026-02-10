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
