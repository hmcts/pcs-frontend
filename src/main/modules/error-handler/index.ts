import { Logger } from '@hmcts/nodejs-logging';
import type { Express, NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { HTTPError } from '../../HttpError';
import { getTranslationFunction, populateCommonTranslations } from '../i18n';

import { authFailure } from './authFailure';

const logger = Logger.getLogger('error-handler');

function getErrorMessages(status: number, t: TFunction): { title: string; paragraph: string } {
  if (status === 400 || status === 403) {
    return {
      title: t('errorPages.403.title'),
      paragraph: t('errorPages.403.paragraph'),
    };
  }
  if (status === 404) {
    return {
      title: t('errorPages.404.title'),
      paragraph: t('errorPages.404.paragraph'),
    };
  }
  return {
    title: t('errorPages.500.title'),
    paragraph: t('errorPages.500.paragraph'),
  };
}

export function createNotFoundHandler(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!res.headersSent && !(res as { writableEnded?: boolean }).writableEnded) {
      const url = req.originalUrl || 'Unknown URL';
      // Skip logging for common browser/dev tools requests that generate harmless 404s
      const shouldSkipLogging = url.startsWith('/.well-known/') || url.startsWith('/favicon.ico');

      if (!shouldSkipLogging) {
        logger.error('Page not found', url);
      }
      next(new HTTPError('Page not found', 404));
    } else {
      next();
    }
  };
}

export function createErrorHandler(env: string): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // If response already sent, don't try to handle the error
    if (res.headersSent || (res as { writableEnded?: boolean }).writableEnded || res.finished) {
      return next(err);
    }

    const httpError = err instanceof HTTPError ? err : new HTTPError(err.message || 'Internal server error', 500);
    const status = httpError.status || 500;

    // Skip logging for common browser/dev tools requests that generate harmless 404s
    const url = req.originalUrl || 'Unknown URL';
    const shouldSkipLogging = status === 404 && (url.startsWith('/.well-known/') || url.startsWith('/favicon.ico'));

    if (!shouldSkipLogging) {
      logger.error(`${err.stack || err}`);
    }

    const t = getTranslationFunction(req, ['common']);
    const { title: errorTitle, paragraph: errorParagraph } = getErrorMessages(status, t);

    res.locals.message = httpError.message;
    res.locals.error = env === 'development' ? httpError : {};
    res.locals.errorTitle = errorTitle;
    res.locals.errorParagraph = errorParagraph;

    populateCommonTranslations(req, res, t);
    res.status(status);
    res.render('error');
  };
}

export function setupErrorHandlers(app: Express, env: string): void {
  // Auth failure handler - catches 401 errors and redirects to login
  // This must be before other error handlers to catch 401s before they're rendered as error pages
  app.use(authFailure);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler(env));
}
