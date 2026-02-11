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

  // Check if user has access via access code validation (internal flow)
  const sessionCaseId = req.session.ccdCase?.id;
  const hasSessionAccess = sessionCaseId === sanitisedCaseReference;

  // Check if this is respond-to-claim journey (citizen-only, external validation flow)
  const isRespondToClaimJourney = req.originalUrl.includes('/respond-to-claim/');

  if (hasSessionAccess || isRespondToClaimJourney) {
    // Skip CCD validation for:
    // 1. Access-code page flow: User validated via frontend access-code page (session has caseId)
    // 2. External validation flow: User validated via pcs-api, accessing respond-to-claim (citizen-only journey)
    logger.info('Skipping CCD verification', {
      caseReference: sanitisedCaseReference,
      reason: hasSessionAccess ? 'session access (access-code page)' : 'respond-to-claim journey (citizen)',
      url: req.originalUrl,
    });

    // Set minimal case data in res.locals (case data fetched when needed)
    res.locals.validatedCase = { id: sanitisedCaseReference, data: {} };

    // Store in session if not already there
    if (!req.session.ccdCase) {
      req.session.ccdCase = { id: sanitisedCaseReference, data: {} };
    }

    return next();
  }

  // Other journeys - validate via CCD
  try {
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      logger.error('User not authenticated - no access token', { caseReference: sanitisedCaseReference });
      return res.status(404).render('error', {
        error: 'Case not found or access denied',
      });
    }

    const validatedCase = await ccdCaseService.getCaseById(accessToken, sanitisedCaseReference);

    // Store validated case in res.locals for request-scoped access (fresh data from START event)
    res.locals.validatedCase = validatedCase;

    // Store only caseId in session (not full case data) to reduce Redis storage
    // Full case data is available in res.locals.validatedCase
    req.session.ccdCase = { id: validatedCase.id, data: {} };

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
