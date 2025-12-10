import { Logger } from '@hmcts/nodejs-logging';
import type { Express, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../../HttpError';

const logger = Logger.getLogger('error-handler');

function getTranslationFunction(req: Request, res: Response): (key: string, defaultValue?: string) => string {
  try {
    const t =
      (res.locals.t as ((key: string, defaultValue?: string) => string) | undefined) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).i18n?.getFixedT?.((req as any).language || 'en', 'common');
    if (t) {
      return t;
    }
    return (key: string, defaultValue?: string) => defaultValue || key;
  } catch {
    return (key: string, defaultValue?: string) => defaultValue || key;
  }
}

function getErrorMessages(
  status: number,
  t: (key: string, defaultValue?: string) => string
): { title: string; paragraph: string } {
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
    next(new HTTPError('Page not found', 404));
  };
}

export function createErrorHandler(env: string): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    logger.error(`${err.stack || err}`);

    const httpError = err instanceof HTTPError ? err : new HTTPError(err.message || 'Internal server error', 500);
    const status = httpError.status || 500;
    const t = getTranslationFunction(req, res);
    const { title: errorTitle, paragraph: errorParagraph } = getErrorMessages(status, t);

    res.locals.message = httpError.message;
    res.locals.error = env === 'development' ? httpError : {};
    res.locals.errorTitle = errorTitle;
    res.locals.errorParagraph = errorParagraph;
    res.locals.serviceName = t('serviceName');
    res.locals.phase = t('phase');
    res.locals.feedback = t('feedback');
    res.locals.languageToggle = t('languageToggle');
    res.locals.back = t('back');
    res.locals.contactUsForHelp = t('contactUsForHelp');
    const contactUsForHelpText = t('contactUsForHelpText');
    if (contactUsForHelpText !== 'contactUsForHelpText') {
      res.locals.contactUsForHelpText = contactUsForHelpText;
    }

    res.status(status);
    res.render('error');
  };
}

export function setupErrorHandlers(app: Express, env: string): void {
  app.use(createNotFoundHandler());
  app.use(createErrorHandler(env));
}
