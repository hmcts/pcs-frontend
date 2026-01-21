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
    return res.status(404).render('error', {
      error: 'Invalid case reference format',
    });
  }

  // values in both
  req.params.caseReference = sanitisedCaseReference;
  res.locals.caseReference = sanitisedCaseReference;

  next();
}
