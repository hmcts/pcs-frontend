import { Logger } from '@hmcts/nodejs-logging';
import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { validateAccessCode } from '../services/pcsApi/pcsApiService';

const logger = Logger.getLogger('validateAccessCode');

export default function validateAccessCodeRoutes(app: Application): void {
  // GET: Display the validation form
  app.get('/validate-access-code/:caseId', oidcMiddleware, (req: Request, res: Response) => {
    const { caseId } = req.params;
    const error = req.query.error as string | undefined;

    return res.render('validateAccessCode', {
      caseId,
      error: error === 'invalid' ? 'Invalid access code. Please try again.' : undefined,
    });
  });

  // POST: Validate the access code
  app.post('/validate-access-code/:caseId', oidcMiddleware, async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const { accessCode } = req.body;
    const userAccessToken = req.session.user?.accessToken;

    if (!userAccessToken) {
      logger.error(`No user access token in session for case ${caseId}`);
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    if (!accessCode || typeof accessCode !== 'string' || accessCode.trim() === '') {
      logger.warn(`Missing access code for case ${caseId}`);
      return res.redirect(303, `/validate-access-code/${caseId}?error=invalid`);
    }

    try {
      const isValid = await validateAccessCode(userAccessToken, caseId, accessCode.trim());

      if (isValid) {
        logger.info(`Access code validated successfully for case ${caseId} - granting user access`);

        // Store caseId in session (user now has access to this case)
        req.session.ccdCase = { id: caseId, data: {} };

        // Redirect to start of respond-to-claim journey
        return res.redirect(303, `/case/${caseId}/respond-to-claim/start-now`);
      } else {
        logger.warn(`Invalid access code provided for case ${caseId}`);
        return res.redirect(303, `/validate-access-code/${caseId}?error=invalid`);
      }
    } catch (error) {
      logger.error(`Failed to validate access code for case ${caseId}:`, error);
      return res.redirect(303, `/validate-access-code/${caseId}?error=invalid`);
    }
  });
}
