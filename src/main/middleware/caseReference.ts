import { NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';

import { Logger } from '@modules/logger';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';
import { sanitiseCaseReference } from '@utils/caseReference';

const logger = Logger.getLogger('caseReferenceMiddleware');

export async function caseReferenceParamMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  caseReference: string
): Promise<void> {
  // Validate format - 16 digits
  const sanitisedCaseReference = sanitiseCaseReference(caseReference);

  if (!sanitisedCaseReference) {
    logger.error('Invalid case reference format', { caseReference });
    return next(new HTTPError('Invalid case reference format', 404));
  }

  // Validate case exists and user has access
  try {
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      logger.error('User not authenticated - no access token', { caseReference: sanitisedCaseReference });
      return next(new HTTPError('Authentication required', 401));
    }

    const validatedCase = await ccdCaseService.getCaseById(accessToken, sanitisedCaseReference);

    // Store validated case as hydrated CcdCaseModel
    res.locals.validatedCase = new CcdCaseModel(validatedCase);

    return next();
  } catch (error) {
    const httpError = error instanceof HTTPError ? error : new HTTPError('Internal server error', 500);

    logger.error('Case access validation failed', {
      caseReference: sanitisedCaseReference,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: httpError.status,
      url: req.originalUrl,
    });

    return next(httpError);
  }
}
