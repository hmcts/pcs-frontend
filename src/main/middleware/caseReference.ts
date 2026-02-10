import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

import { ccdCaseService } from '../services/ccdCaseService';
import { sanitiseCaseReference } from '../utils/caseReference';

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
    return res.status(404).render('error', {
      error: 'Invalid case reference format',
    });
  }

  // Validate case exists and user has access
  try {
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      logger.error('User not authenticated - no access token', { caseReference: sanitisedCaseReference });
      return res.status(404).render('error', {
        error: 'Case not found or access denied',
      });
    }

    const validatedCase = await ccdCaseService.getCaseById(accessToken, sanitisedCaseReference);

    // Store validated case in both locations
    res.locals.validatedCase = validatedCase;

    // Also update session to ensure draft data from START event is available to all middleware
    req.session.ccdCase = validatedCase;

    next();
  } catch (error) {
    logger.error('Case access validation failed', {
      caseReference: sanitisedCaseReference,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.originalUrl,
    });
    return res.status(404).render('error', {
      error: 'Case not found or access denied',
    });
  }
}
