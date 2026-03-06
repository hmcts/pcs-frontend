/**
 * ⚠️ TEMPORARY TESTING ROUTE - WILL BE DELETED LATER
 * Simple page to test CCD final submit with minimal data payload
 *
 * Uses CCD's two-phase START → SUBMIT pattern:
 * 1. START: GET /event-triggers/respondPossessionClaim → event_token
 * 2. SUBMIT: POST /events with minimal data { possessionClaimResponse: {} } and event_token
 *
 * Note: pcs-api SubmitEventHandler requires possessionClaimResponse to be non-null
 * to pass validation, then it loads actual data from draft database.
 */
import config from 'config';
import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { http } from '../modules/http';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('finalSubmit');

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };
}

export default function finalSubmitRoutes(app: Application): void {
  // GET: Display final submit page
  app.get('/case/:caseId/final-submit', oidcMiddleware, (req: Request, res: Response) => {
    const caseId = req.params.caseId as string;

    // Validate caseId format (16 digits only) to prevent SSRF
    if (!/^\d{16}$/.test(caseId)) {
      logger.warn(`Invalid caseId format: ${caseId}`);
      return res.render('finalSubmit', {
        caseId,
        error: 'Invalid case reference',
      });
    }

    const error = req.query.error as string | undefined;

    return res.render('finalSubmit', {
      caseId,
      error: error === 'failed' ? 'Failed to submit response. Please try again.' : undefined,
    });
  });

  // POST: Submit to CCD with minimal data
  app.post('/case/:caseId/final-submit', oidcMiddleware, async (req: Request, res: Response) => {
    const caseId = req.params.caseId as string;
    const userAccessToken = req.session.user?.accessToken;

    // Validate caseId format (16 digits only) to prevent SSRF
    if (!/^\d{16}$/.test(caseId)) {
      logger.warn(`Invalid caseId format: ${caseId}`);
      return res.redirect(303, `/case/${caseId}/final-submit?error=failed`);
    }

    if (!userAccessToken) {
      logger.error(`No user access token in session for case ${caseId}`);
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    try {
      logger.info(`Submitting response to claim for case ${caseId}`);

      // Phase 1: START - Get event token from CCD
      const eventUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/respondPossessionClaim`;
      logger.info(`Calling START callback: ${eventUrl}`);

      const startResponse = await http.get<{ token: string }>(eventUrl, getCaseHeaders(userAccessToken));
      const eventToken = startResponse.data.token;

      logger.info('Received event token from START callback');

      // Phase 2: SUBMIT - Post minimal data to CCD
      // Note: possessionClaimResponse: {} is required to pass pcs-api validation
      // pcs-api will load actual data from draft database
      const submitUrl = `${getBaseUrl()}/cases/${caseId}/events`;
      const payload = {
        data: {
          possessionClaimResponse: {}, // Minimal empty object to pass validation
        },
        event: {
          id: 'respondPossessionClaim',
          summary: 'Citizen respondPossessionClaim summary',
          description: 'Citizen respondPossessionClaim description',
        },
        event_token: eventToken,
        ignore_warning: false,
      };

      logger.info(`Calling SUBMIT with minimal data: ${submitUrl}`);
      logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);

      await http.post(submitUrl, payload, getCaseHeaders(userAccessToken));

      logger.info(`Response submitted successfully for case ${caseId}`);

      return res.redirect(303, `/case/${caseId}/confirmation`);
    } catch (error) {
      logger.error(`Failed to submit response for case ${caseId}:`, error);
      return res.redirect(303, `/case/${caseId}/final-submit?error=failed`);
    }
  });

  // GET: Confirmation page
  app.get('/case/:caseId/confirmation', oidcMiddleware, (req: Request, res: Response) => {
    const caseId = req.params.caseId as string;
    return res.render('confirmation', { caseId });
  });
}
