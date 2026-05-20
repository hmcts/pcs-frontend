import { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';

import { Logger } from '@modules/logger';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';

const logger = Logger.getLogger('requireEventAccessMiddleware');

export function requireEventAccess(eventId: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawCaseReference = req.params?.caseReference;
    const caseReference = typeof rawCaseReference === 'string' ? rawCaseReference : undefined;

    if (!caseReference) {
      logger.error('Missing case reference on request', { originalUrl: req.originalUrl });
      return next(new HTTPError('Invalid case reference format', 404));
    }

    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      logger.error('User not authenticated - no access token', { caseReference });
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const validatedCase = await ccdCaseService.getCaseById(accessToken, caseReference, eventId);
      res.locals.validatedCase = new CcdCaseModel(validatedCase);
      return next();
    } catch (error) {
      const httpError = error instanceof HTTPError ? error : new HTTPError('Internal server error', 500);

      logger.error('Case access validation failed', {
        caseReference,
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: httpError.status,
        url: req.originalUrl,
      });

      return next(httpError);
    }
  };
}
