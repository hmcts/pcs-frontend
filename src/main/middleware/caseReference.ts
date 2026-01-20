import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

const logger = Logger.getLogger('caseReferenceMiddleware');

export function caseReferenceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const caseReference = req.params.caseReference;

  if (!caseReference) {
    logger.error('No case reference found in URL');
    return res.status(400).render('error', {
      error: 'Invalid case reference',
    });
  }

  // validate format - 16 digits
  if (!/^\d{16}$/.test(caseReference)) {
    logger.error('Invalid case reference format', { caseReference });
    return res.status(400).render('error', {
      error: 'Invalid case reference format',
    });
  }

  // store in session
  if (req.session) {
    req.session.caseReference = caseReference;
  }

  logger.debug('Case reference validated', { caseReference });
  next();
}
