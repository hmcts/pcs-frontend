import type { Application, Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

import { caseReferenceParamMiddleware } from '../middleware/caseReference';
import { oidcMiddleware } from '../middleware/oidc';
import { getRespondToClaimConfirmationPath } from '../steps/utils/postSubmissionRouting';

import { Logger } from '@modules/logger';
import { ccdCaseService } from '@services/ccdCaseService';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('finalSubmit');

export default function finalSubmitRoutes(app: Application): void {
  const finalSubmitRouter: Router = createRouter({ mergeParams: true });

  finalSubmitRouter.param('caseReference', caseReferenceParamMiddleware);

  finalSubmitRouter.post('/:caseReference/final-submit', oidcMiddleware, async (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;

    if (!validatedCase) {
      logger.error('Final submit POST: validatedCase is undefined - middleware not executed');
      return res.status(500).render('error', {
        error: 'Internal server error',
      });
    }

    const caseId = validatedCase.id;
    const userAccessToken = req.session.user?.accessToken;

    if (!userAccessToken) {
      logger.error(`No user access token in session for case ${caseId}`);
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    try {
      logger.info(`Submitting response to claim for case ${caseId}`);
      await ccdCaseService.submitResponseToClaim(userAccessToken, validatedCase);
      logger.info(`Response submitted successfully for case ${caseId}`);

      return safeRedirect303(res, getRespondToClaimConfirmationPath(caseId, validatedCase.data), '/', ['/case']);
    } catch (error) {
      logger.error(`Failed to submit response for case ${caseId}:`, error);
      return safeRedirect303(res, `/case/${caseId}/respond-to-claim/check-your-answers?submitError=failed`, '/', [
        '/case',
      ]);
    }
  });

  app.use('/case', finalSubmitRouter);
}
