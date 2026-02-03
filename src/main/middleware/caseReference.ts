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
  logger.info('[***START****] Case reference middleware start', {
    url: req.originalUrl,
    rawCaseReference: caseReference,
  });

  // Validate format - 16 digits
  const sanitisedCaseReference = sanitiseCaseReference(caseReference);

  if (!sanitisedCaseReference) {
    logger.error('Invalid case reference format', { caseReference });
    return res.status(404).render('error', {
      error: 'Invalid case reference format',
    });
  }

  logger.info('[****SANITISED******] Case reference format validated', {
    sanitisedCaseReference,
    originalInput: caseReference,
  });

  // Validate case exists and user has access
  try {
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      logger.error('User not authenticated - no access token', { caseReference: sanitisedCaseReference });
      return res.status(404).render('error', {
        error: 'Case not found or access denied',
      });
    }

    logger.info('[*****VALIDATING*******] Calling CCD to validate case access', {
      caseReference: sanitisedCaseReference,
      url: req.originalUrl,
    });

    const validatedCase = await ccdCaseService.getCaseById(accessToken, sanitisedCaseReference);

    logger.info('[*****VALIDATED*****] Case data retrieved from CCD', {
      caseId: validatedCase.id,
      hasData: !!validatedCase.data,
      dataKeys: Object.keys(validatedCase.data || {}),
    });

    // Store validated case
    res.locals.validatedCase = validatedCase;

    logger.info('[****SUCCESS*****] Case access validation done - validatedCase stored', {
      validatedCaseId: validatedCase.id,
      url: req.originalUrl,
    });

    next();
  } catch (error) {
    logger.error('[****FAILED*****] Case access validation failed', {
      caseReference: sanitisedCaseReference,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.originalUrl,
    });
    return res.status(404).render('error', {
      error: 'Case not found or access denied',
    });
  }
}
