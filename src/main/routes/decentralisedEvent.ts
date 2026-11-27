import config from 'config';
import { Application, Request, Response, Router } from 'express';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { sanitiseCaseReference } from '@utils/caseReference';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('decentralisedEventRoutes');

/** The query an event's page needs from what XUI hands over: its order, application, hearing and task. */
const HANDED_OVER_PARAMS = new Map<unknown, readonly string[]>([
  ['ext:makeOrder', ['orderId', 'taskId', 'genAppId', 'hearingId']],
  ['ext:confirmOrderReview', ['orderId', 'taskId']],
]);

// Ids only, which the redirect passes on unchanged.
const ID = /^[A-Za-z0-9-]{1,64}$/;

function handedOverQuery(eventId: unknown, query: Request['query']): string {
  const handedOver = new URLSearchParams();
  for (const name of HANDED_OVER_PARAMS.get(eventId) ?? []) {
    const value = query[name];
    if (typeof value === 'string' && ID.test(value)) {
      handedOver.append(name, value);
    }
  }
  return handedOver.toString();
}

export default function decentralisedEventRoutes(app: Application): void {
  const router = Router({ mergeParams: true });

  router.use(oidcMiddleware);

  router.get('/:caseReference/event/:eventId', (req: Request, res: Response) => {
    const rawCaseReference = req.params.caseReference;
    const eventId = req.params.eventId;
    const rawExpectedSub = req.query.expected_sub;
    const expectedSub = typeof rawExpectedSub === 'string' ? rawExpectedSub : undefined;

    const caseReference = typeof rawCaseReference === 'string' ? sanitiseCaseReference(rawCaseReference) : null;
    if (!caseReference) {
      logger.error('Invalid case reference format', { caseReference: rawCaseReference });
      return res.status(404).send('Not Found');
    }

    if (!config.has('decentralisedEventRoutes.' + eventId)) {
      logger.error('Unsupported event ID redirect attempted', { eventId, caseReference });
      return res.status(404).send('Not Found');
    }

    if (!expectedSub) {
      logger.warn('Missing expected_sub in decentralised event request', { caseReference, eventId });
      return res.status(404).send('Not found');
    }

    const user = req.session?.user;
    const isUserMatch = [user?.sub, user?.uid, user?.id, user?.email].includes(expectedSub);

    if (!isUserMatch) {
      logger.warn('User IDAM subject mismatch (expected_sub), forcing re-authentication', {
        caseReference,
      });
      if (!req.session.returnTo) {
        req.session.returnTo = req.originalUrl;
      }
      const authSessionKeys = ['user', 'ccdCase', 'codeVerifier', 'nonce'] as const;
      for (const key of authSessionKeys) {
        delete req.session[key];
      }

      return res.redirect('/login');
    }

    logger.info('Decentralised event validation successful, redirecting to CUI', {
      caseReference,
      eventId,
    });

    const redirectRoute = config
      .get<string>('decentralisedEventRoutes.' + eventId)
      .replace(':caseReference', caseReference);
    const query = handedOverQuery(eventId, req.query);
    return safeRedirect303(res, query ? `${redirectRoute}?${query}` : redirectRoute);
  });

  // Mount at /cases
  app.use('/cases', router);
}
