/**
 * TEMPORARY TESTING ROUTE - WILL BE DELETED LATER
 * Simple page to test CCD final submit with minimal data payload
 *
 * Uses CCD's two-phase START to SUBMIT pattern:
 * 1. START: GET /event-triggers/respondPossessionClaim returns event_token
 * 2. SUBMIT: POST /events with minimal data { possessionClaimResponse: {} } and event_token
 *
 * Note: pcs-api SubmitEventHandler requires possessionClaimResponse to be non-null
 * to pass validation, then it loads actual data from draft database.
 */
import config from 'config';
import type { Application, Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

import { caseReferenceParamMiddleware } from '../middleware/caseReference';
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
  // Create dedicated router for final submit routes
  const finalSubmitRouter: Router = createRouter({ mergeParams: true });

  // Apply param middleware - validates format AND user access
  // This ensures res.locals.validatedCase is set for routes with :caseReference
  finalSubmitRouter.param('caseReference', caseReferenceParamMiddleware);

  // GET: Display final submit page
  finalSubmitRouter.get('/:caseReference/final-submit', oidcMiddleware, (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;

    if (!validatedCase) {
      logger.error('Final submit: validatedCase is undefined - middleware not executed');
      return res.status(500).render('error', {
        error: 'Internal server error',
      });
    }

    const caseId = validatedCase.id;
    const error = req.query.error as string | undefined;

    return res.render('finalSubmit', {
      caseId,
      error: error === 'failed' ? 'Failed to submit response. Please try again.' : undefined,
    });
  });

  // POST: Submit to CCD with minimal data
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
  finalSubmitRouter.get('/:caseReference/confirmation', oidcMiddleware, (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;

    if (!validatedCase) {
      logger.error('Confirmation: validatedCase is undefined - middleware not executed');
      return res.status(500).render('error', {
        error: 'Internal server error',
      });
    }

    const caseId = validatedCase.id;
    return res.render('confirmation', { caseId });
  });

  // Mount router under /case
  app.use('/case', finalSubmitRouter);
}
