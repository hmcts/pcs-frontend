import config from 'config';
import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('reasonableAdjustmentsCallback');

// Return leg from the CUI Your Support (cui-ra) microsite. On completion cui-ra redirects the
// browser to /case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id, where
// :id retrieves the citizen's submitted answers (Step 4: GET /api/payload/:id — S2S-only).
//
// For now we fetch that payload and log what cui-ra returns (the flags/action/correlationId) so
// we can see the shape. Persisting the answers onto the case is a later AC.
export default function reasonableAdjustmentsCallbackRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id',
    oidcMiddleware,
    async (req: Request, res: Response) => {
      const caseReference = String(req.params.caseReference || '');
      const payloadId = String(req.params.id || '');

      // GET /api/payload/:id authenticates with the S2S service token only (no idam-token).
      const serviceToken = await req.app.locals.redisClient?.get(config.get<string>('s2s.key'));
      if (serviceToken) {
        try {
          const payload = await cuiRaService.getPayload(payloadId, serviceToken);
          // TODO(later AC): persist these answers onto the case instead of just logging them.
          logger.info(`Your Support payload for case ${caseReference}, id ${payloadId}: ${JSON.stringify(payload)}`);
        } catch (error) {
          logger.error(`Failed to fetch Your Support payload for id ${payloadId}`, error);
        }
      } else {
        logger.error(`No S2S service token available to fetch Your Support payload for id ${payloadId}`);
      }

      return safeRedirect303(
        res,
        `/case/${caseReference}/respond-to-claim/reasonable-adjustments-confirmation`,
        `/case/${caseReference}`,
        ['/case']
      );
    }
  );
}
