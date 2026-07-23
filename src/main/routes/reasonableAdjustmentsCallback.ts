import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('reasonableAdjustmentsCallback');

// Return leg from the CUI Your Support (cui-ra) microsite. On completion cui-ra redirects the
// browser to /case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id, where
// :id is the payload id used to retrieve the submitted answers (GET /api/payload/:id).
//
// For now we capture the id and forward to the confirmation page. Retrieving/persisting the
// answers with that id is a later AC — that logic (and this capture) will move onto the
// confirmation step then.
export default function reasonableAdjustmentsCallbackRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id',
    oidcMiddleware,
    (req: Request, res: Response) => {
      const caseReference = String(req.params.caseReference || '');
      const payloadId = req.params.id;

      // TODO(later AC): use this id to GET /api/payload/:id and persist the Your Support answers.
      logger.info(`Your Support callback for case ${caseReference}, cui-ra payload id: ${payloadId}`);

      return safeRedirect303(
        res,
        `/case/${caseReference}/respond-to-claim/reasonable-adjustments-confirmation`,
        `/case/${caseReference}`,
        ['/case']
      );
    }
  );
}
