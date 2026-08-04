import { NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';

import { Logger } from '@modules/logger';
import { sanitiseCaseReference } from '@utils/caseReference';

const logger = Logger.getLogger('caseReferenceMiddleware');

export async function caseReferenceParamMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  caseReference: string
): Promise<void> {
  const sanitisedCaseReference = sanitiseCaseReference(caseReference);

  if (!sanitisedCaseReference) {
    logger.error('Invalid case reference format', { caseReference });
    return next(new HTTPError('Invalid case reference format', 404));
  }

  req.params.caseReference = sanitisedCaseReference;
  return next();
}
