import config from 'config';
import { Application, Request, Response, Router } from 'express';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { sanitiseCaseReference } from '@utils/caseReference';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('decentralisedEventRoutes');

export default function decentralisedEventRoutes(app: Application): void {
  const router = Router({ mergeParams: true });

  router.use(oidcMiddleware);

  router.get('/:caseReference/event/:eventId', (req: Request, res: Response) => {
    const rawCaseReference = req.params.caseReference;
    const eventId = req.params.eventId;
    const expectedSub = req.query.expected_sub;

    const caseReference = typeof rawCaseReference === 'string' ? sanitiseCaseReference(rawCaseReference) : null;
    if (!caseReference) {
      logger.error('Invalid case reference format', { caseReference: rawCaseReference });
      return res.status(404).send('Not Found');
    }

    if (eventId !== 'ext:respondPossessionClaim') {
      logger.error('Unsupported event ID redirect attempted', { eventId, caseReference });
      return res.status(404).send('Not Found');
    }

    const user = req.session?.user;
    const isUserMatch =
      !expectedSub ||
      user?.sub === expectedSub ||
      user?.uid === expectedSub ||
      user?.id === expectedSub ||
      user?.email === expectedSub;

    if (!isUserMatch) {
      logger.warn('User IDAM subject mismatch (expected_sub), forcing re-authentication', {
        expectedSub,
        currentSub: user?.sub || user?.uid || user?.id || user?.email,
        caseReference,
      });
      req.session.returnTo = req.originalUrl;
      return req.session.save(() => res.redirect('/login'));
    }

    logger.info('Decentralised event validation successful, redirecting to CUI respond to claim start page', {
      caseReference,
      eventId,
    });

    return safeRedirect303(res, `/case/${caseReference}/respond-to-claim/start-now`);
  });

  // Mount at /cases
  app.use('/cases', router);
}
