import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

export default function (app: Application): void {
  const logger = Logger.getLogger('pui-landing');

  app.get('/pui/:caseReference/:eventId/start', oidcMiddleware, async (req: Request, res: Response) => {
    const caseReference = req.params.caseReference;
    const eventId = req.params.eventId;
    const puiUserId = req.query.userId;

    const loginRefreshInProgress = req.session.puiLoginRefresh;
    const user = req.session.user;
    const currentUserId = user?.uid;

    const reloginRequired = currentUserId !== puiUserId;

    if (reloginRequired && !loginRefreshInProgress) {
      // TODO: Change to debug
      logger.info(`A login refresh is required. Current user = ${currentUserId}, requested user = ${puiUserId}`);
      req.session.regenerate((err: unknown) => {
        if (err) {
          this.logger.error('Session regeneration error:', err);
        }
        req.session.puiLoginRefresh = true;
        req.session.returnTo = req.originalUrl;
        res.redirect('/login');
      });
      // delete req.session.user;

      return;
    }

    if (reloginRequired) {
      logger.warn('Login refresh occurred, but the user ID still does not match the passed userId parameter');
      // TODO: Show error page and/or redirect back to ExUI?
      // TODO: Logout and try once more?
    }

    req.session.puiLoginRefresh = false;

    const eventUrl = `/pui/${caseReference}/${eventId}`;
    logger.info(`Redirecting to ${eventUrl}`);
    res.redirect(eventUrl);
  });

  app.get('/pui/whoami', oidcMiddleware, async (req: Request, res: Response) => {
    res.render('pui/whoami', {});
  });
}
