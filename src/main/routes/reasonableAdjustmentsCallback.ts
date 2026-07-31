import config from 'config';
import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../steps/respond-to-claim/draftEvent';

import { Logger } from '@modules/logger';
import type { PossessionClaimResponse } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { toCcdFlags } from '@services/cuiRa/flagMapping';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('reasonableAdjustmentsCallback');

// Return leg from the CUI Your Support (cui-ra) microsite. 
// On a 'submit' — persist the returned flags to the case DRAFT
// On a 'cancel' → the "no request sent" page; 
// a retrieval failure → the RA error page.
export default function reasonableAdjustmentsCallbackRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id',
    oidcMiddleware,
    async (req: Request, res: Response) => {
      const caseReference = String(req.params.caseReference || '');
      const payloadId = String(req.params.id || '');
      const fallback = `/case/${caseReference}`;
      const confirmationUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-confirmation`;
      const cancelledUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-cancelled`;
      const errorUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-error`;

      // GET /api/payload/:id authenticates with the S2S service token only (no idam-token).
      const serviceToken = await req.app.locals.redisClient?.get(config.get<string>('s2s.key'));
      if (!serviceToken) {
        logger.error(`No S2S service token available to fetch Your Support payload for id ${payloadId}`);
        return safeRedirect303(res, errorUrl, fallback, ['/case']);
      }

      try {
        const payload = await cuiRaService.getPayload(payloadId, serviceToken);
        logger.info(
          `Your Support payload received for case ${caseReference}, id ${payloadId}, action ${payload.action}`
        );

        // Only an explicit 'submit' persists flags + shows the "request sent" confirmation; 'cancel'
        // (or any other value) means nothing was sent → the "No request was sent" page.
        if (payload.action !== 'submit') {
          return safeRedirect303(res, cancelledUrl, fallback, ['/case']);
        }

        // Persist the returned flags to the case DRAFT via the same citizen respondPossessionClaim
        // draft-save our journey pages use.
        const rawFlags = payload.replacementFlags ?? payload.flagsAsSupplied;
        if (rawFlags) {
          const defendantFlags = toCcdFlags(rawFlags);
          // flags-only post would wipe the defendant's answers. Load the current response first and post it back
          // alongside the flags. `
          const accessToken = req.session.user?.accessToken;
          const existing = await ccdCaseService.getCaseByIdForEvent(
            accessToken ?? '',
            caseReference,
            'respondPossessionClaim',
            req.session?.clientContext
          );
          // Narrow to the defendant slice only
          const existingResponse = existing.data?.possessionClaimResponse ?? {};
          const possessionClaimResponse: PossessionClaimResponse = {
            defendantContactDetails: existingResponse.defendantContactDetails,
            defendantResponses: existingResponse.defendantResponses,
            defendantFlags,
          };
          await ccdCaseService.updateDraft(
            RESPOND_TO_CLAIM_DRAFT_EVENT,
            accessToken,
            caseReference,
            { possessionClaimResponse },
            req.session?.clientContext
          );
        }
        return safeRedirect303(res, confirmationUrl, fallback, ['/case']);
      } catch (error) {
        logger.error(`Failed to fetch or persist Your Support payload for id ${payloadId}`, error);
        return safeRedirect303(res, errorUrl, fallback, ['/case']);
      }
    }
  );
}
