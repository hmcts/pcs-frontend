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

// Return leg from the CUI Your Support (cui-ra) microsite. On completion cui-ra redirects the
// browser to /case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id. Per the
// cui-ra docs this URL presents NO UI: we retrieve the payload (Step 4: GET /api/payload/:id,
// S2S-only), then — on a 'submit' — persist the returned flags to the case DRAFT via the normal
// citizen respondPossessionClaim draft-save (ccdCaseService.updateDraft), and redirect to the
// confirmation page. 'cancel' → the "no request sent" page; a retrieval failure → the RA error page.
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
        logger.info(`Your Support payload for case ${caseReference}, id ${payloadId}: ${JSON.stringify(payload)}`);

        // Only an explicit 'submit' persists flags + shows the "request sent" confirmation; 'cancel'
        // (or any other value) means nothing was sent → the "No request was sent" page.
        if (payload.action !== 'submit') {
          return safeRedirect303(res, cancelledUrl, fallback, ['/case']);
        }

        // Persist the returned flags to the case DRAFT via the same citizen respondPossessionClaim
        // draft-save our journey pages use. pcs-api stores them at
        // `possessionClaimResponse.defendantFlags` (party-level, defendant slice). `replacementFlags`
        // is the full updated collection (flags added); `flagsAsSupplied` is the collection when
        // only cancellations happened. Map cui-ra's shape to CCD `Flags` (`path` item `{ name }` →
        // `{ value }`) or pcs-api silently drops `path`.
        const rawFlags = payload.replacementFlags ?? payload.flagsAsSupplied;
        if (rawFlags) {
          const defendantFlags = toCcdFlags(rawFlags);
          // The draft-save FULLY REPLACES the stored defendant response (pcs-api's midEvent does
          // not merge), and the final submit reads this same draft — so a flags-only post would
          // wipe the defendant's answers. Load the current response first and post it back
          // alongside the flags. `getCaseByIdForEvent` is the same call the journey uses to resume,
          // so it reflects the in-progress draft.
          const accessToken = req.session.user?.accessToken;
          const existing = await ccdCaseService.getCaseByIdForEvent(
            accessToken ?? '',
            caseReference,
            'respondPossessionClaim',
            req.session?.clientContext
          );
          const possessionClaimResponse: PossessionClaimResponse = {
            ...(existing.data?.possessionClaimResponse ?? {}),
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
