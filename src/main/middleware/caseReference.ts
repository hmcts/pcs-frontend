import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

import { sanitiseCaseReference } from '../utils/caseReference';

const logger = Logger.getLogger('caseReferenceMiddleware');

export function caseReferenceParamMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  caseReference: string
): void {
  // validate format - 16 digits
  const sanitisedCaseReference = sanitiseCaseReference(caseReference);
  if (!sanitisedCaseReference) {
    logger.error('Invalid case reference format', { caseReference });
    return res.status(400).render('error', {
      error: 'Invalid case reference format',
    });
  }

  // make available to views via res.locals
  res.locals.caseReference = sanitisedCaseReference;

  logger.debug('Case reference validated', { caseReference: sanitisedCaseReference });
  next();
}
