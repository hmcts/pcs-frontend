import type { Application, Request, Response } from 'express';

import { cuiYourSupportFeatureMiddleware } from '../middleware/cuiYourSupportFeatureMiddleware';
import { oidcMiddleware } from '../middleware/oidc';
import { respondToClaimFeatureMiddleware } from '../middleware/respondToClaimFeatureMiddleware';
import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../steps/respond-to-claim/draftEvent';

import { http } from '@modules/http';
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
    // Gate the draft write behind the same respond-to-claim and it's own feature flag
    respondToClaimFeatureMiddleware,
    cuiYourSupportFeatureMiddleware,
    async (req: Request, res: Response) => {
      const caseReference = String(req.params.caseReference || '');
      const payloadId = String(req.params.id || '');
      const fallback = `/case/${caseReference}`;
      const confirmationUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-confirmation`;
      const cancelledUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-cancelled`;
      const errorUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-error`;

      // GET /api/payload/:id authenticates with the S2S service token only (no idam-token). Source it
      // from the shared http client (proactively refreshed 30s before expiry), not a direct Redis
      // read which can return a stale/expired token.
      let serviceToken: string;
      try {
        serviceToken = await http.getValidS2SToken();
      } catch (error) {
        logger.error(`No S2S service token available to fetch Your Support payload for id ${payloadId}`, error);
        return safeRedirect303(res, errorUrl, fallback, ['/case']);
      }

      try {
        // Verify the user has access to this case BEFORE calling cui-ra with a URL-supplied id.
        // `getCaseByIdForEvent` triggers the citizen respondPossessionClaim event (the same call the
        // journey uses to resume): it enforces access (throws → error page if the user cannot access
        // this case) and returns the in-progress draft response we preserve when persisting flags.
        const accessToken = req.session.user?.accessToken;
        const existing = await ccdCaseService.getCaseByIdForEvent(
          accessToken ?? '',
          caseReference,
          'respondPossessionClaim',
          req.session?.clientContext
        );

        const payload = await cuiRaService.getPayload(payloadId, serviceToken);
        logger.info(
          `Your Support payload received for case ${caseReference}, id ${payloadId}, action ${payload.action}`
        );

        // Bind the fetched payload to THIS case. `payloadId` comes straight from the URL and is not
        // otherwise tied to the case or user, so we verify the payload's correlationId — which we set
        // to the case reference when invoking the microsite (startYourSupport) — matches the case in
        // the callback URL. Without this, a logged-in user could pull another party's (special-
        // category) adjustment flags into their own draft via an arbitrary id.
        if (payload.correlationId !== caseReference) {
          logger.error(
            `Your Support payload ${payloadId} correlationId '${payload.correlationId}' does not match case ` +
              `${caseReference} — refusing to persist`
          );
          return safeRedirect303(res, errorUrl, fallback, ['/case']);
        }

        // cui-ra returns the updated flag collection in one of two fields: `replacementFlags` when
        // flags were added (the full updated set, cancellations folded in) and `flagsAsSupplied` when
        // flags were cancelled/removed (the supplied set with cancelled statuses). Both are real
        // changes to persist. NOTE: contrary to the docs, on a pure removal cui-ra sends BOTH — an
        // EMPTY `replacementFlags` ({ details: [] }) alongside the populated `flagsAsSupplied`
        // Pick whichever collection actually has flags, preferring `replacementFlags`.
        // "No request was sent" only when microsite was abandoned (action !== 'submit')
        // or neither collection has any flags.
        const flags = payload.replacementFlags?.details?.length ? payload.replacementFlags : payload.flagsAsSupplied;
        if (payload.action !== 'submit' || !flags?.details?.length) {
          return safeRedirect303(res, cancelledUrl, fallback, ['/case']);
        }

        // Persist the returned flags to the case DRAFT via the same citizen respondPossessionClaim
        // draft-save our journey pages use. The draft-save fully REPLACES the defendant response (and
        // the final submit reads this same draft), so re-send the existing answers — narrowed to the
        // defendant slice — alongside the flags, or a flags-only post would wipe them.
        const defendantFlags = toCcdFlags(flags);
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
        return safeRedirect303(res, confirmationUrl, fallback, ['/case']);
      } catch (error) {
        logger.error(`Failed to fetch or persist Your Support payload for id ${payloadId}`, error);
        return safeRedirect303(res, errorUrl, fallback, ['/case']);
      }
    }
  );
}
