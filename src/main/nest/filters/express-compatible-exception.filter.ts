import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { HTTPError } from '../../HttpError';
import { getTranslationFunction, populateCommonTranslations } from '../../modules/i18n';

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

@Catch()
export class ExpressCompatibleExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If response already sent, don't try to handle the error
    if (response.headersSent || response.writableEnded || response.finished) {
      return;
    }

    // Determine status code
    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as { message?: string }).message || exception.message;
    } else if (exception instanceof HTTPError) {
      status = exception.status || 500;
      message = exception.message;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    // Get translations
    const t = getTranslationFunction(request, ['common']);
    const { title: errorTitle, paragraph: errorParagraph } = getErrorMessages(status, t);

    // Set response locals (same as Express error handler)
    response.locals.message = message;
    response.locals.error = process.env.NODE_ENV === 'development' ? exception : {};
    response.locals.errorTitle = errorTitle;
    response.locals.errorParagraph = errorParagraph;

    // Populate common translations
    populateCommonTranslations(request, response, t);

    // Render the error template (same as Express)
    response.status(status);
    response.render('error');
  }
}
