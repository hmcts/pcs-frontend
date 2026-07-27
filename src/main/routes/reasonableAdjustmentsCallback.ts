import config from 'config';
import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('reasonableAdjustmentsCallback');

// Return leg from the CUI Your Support (cui-ra) microsite. On completion cui-ra redirects the
// browser to /case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id. Per the
// cui-ra docs this URL presents NO UI: we retrieve the payload (Step 4: GET /api/payload/:id,
// S2S-only) and then redirect to the next screen based on the result — the confirmation page if we
// retrieved it, or the RA error page if we couldn't. Persisting the answers, and action-based
// routing (submit vs cancel), are a later AC.
export default function reasonableAdjustmentsCallbackRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id',
    oidcMiddleware,
    async (req: Request, res: Response) => {
      const caseReference = String(req.params.caseReference || '');
      const payloadId = String(req.params.id || '');
      const fallback = `/case/${caseReference}`;
      const confirmationUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-confirmation`;
      const errorUrl = `/case/${caseReference}/respond-to-claim/reasonable-adjustments-error`;

      // GET /api/payload/:id authenticates with the S2S service token only (no idam-token).
      const serviceToken = await req.app.locals.redisClient?.get(config.get<string>('s2s.key'));
      if (!serviceToken) {
        logger.error(`No S2S service token available to fetch Your Support payload for id ${payloadId}`);
        return safeRedirect303(res, errorUrl, fallback, ['/case']);
      }

      try {
        const payload = await cuiRaService.getPayload(payloadId, serviceToken);
        // TODO(later AC): persist these answers onto the case, and use payload.action to pick the
        // next step — e.g. a 'cancel' should not land on the "request sent" confirmation.
        logger.info(`Your Support payload for case ${caseReference}, id ${payloadId}: ${JSON.stringify(payload)}`);
        return safeRedirect303(res, confirmationUrl, fallback, ['/case']);
      } catch (error) {
        logger.error(`Failed to fetch Your Support payload for id ${payloadId}`, error);
        return safeRedirect303(res, errorUrl, fallback, ['/case']);
      }
    }
  );
}
