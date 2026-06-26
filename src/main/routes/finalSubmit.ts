/**
 * Submit handler for respond-to-claim check-your-answers (POST only).
 *
 * Uses CCD's two-phase START to SUBMIT pattern via shared respondToClaimFinalSubmit.
 */
import type { Application, Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

import { caseReferenceParamMiddleware } from '../middleware/caseReference';
import { oidcMiddleware } from '../middleware/oidc';
import { requireEventAccess } from '../middleware/requireEventAccess';
import {
  RespondToClaimFinalSubmitError,
  getEndOfJourneyCyaSubmitErrorPath,
  submitRespondToClaimResponse,
} from '../steps/utils/respondToClaimFinalSubmit';

import { Logger } from '@modules/logger';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('finalSubmit');

export default function finalSubmitRoutes(app: Application): void {
  const finalSubmitRouter: Router = createRouter({ mergeParams: true });

  finalSubmitRouter.param('caseReference', caseReferenceParamMiddleware);

  finalSubmitRouter.use(['/:caseReference/final-submit'], requireEventAccess('respondPossessionClaim'));

  finalSubmitRouter.post('/:caseReference/final-submit', oidcMiddleware, async (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;

    if (!validatedCase) {
      logger.error('Final submit POST: validatedCase is undefined - middleware not executed');
      return res.status(500).render('error', {
        error: 'Internal server error',
      });
    }

    const caseId = validatedCase.id;

    if (!req.session.user?.accessToken) {
      logger.error(`No user access token in session for case ${caseId}`);
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    try {
      req.res = res;
      const { confirmationPath } = await submitRespondToClaimResponse(req);
      return safeRedirect303(res, confirmationPath, '/', ['/case']);
    } catch (error) {
      if (error instanceof RespondToClaimFinalSubmitError && error.message === 'No user access token in session') {
        return res.status(401).render('error', { error: 'Authentication required' });
      }

      logger.error(`Failed to submit response for case ${caseId}:`, error);
      return safeRedirect303(res, getEndOfJourneyCyaSubmitErrorPath(caseId), '/', ['/case']);
    }
  });

  app.use('/case', finalSubmitRouter);
}
