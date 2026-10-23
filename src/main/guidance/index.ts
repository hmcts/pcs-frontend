import express, { type NextFunction, type Request, type Response, Router } from 'express';
import i18next from 'i18next';

import { PREPARE_TO_RESPOND_PATH, prepareToRespondPage } from './prepareToRespond';

/**
 * Pages anyone can read, signed in or not, and the assets they need. Mounted before the modules, so they
 * do not depend on the session (Redis), IDAM, LaunchDarkly or CSRF, and are not caught by the signed-in
 * user's role middleware. Only exact GET and HEAD paths are handled here; everything else falls through
 * to the application as before.
 */
export function publicRouter(publicDir: string): Router {
  const router = Router();
  // i18next loads the locale files after the I18n module starts it, so a request can arrive first.
  const i18nReady = new Promise<void>(resolve =>
    i18next.isInitialized ? resolve() : i18next.once('initialized', () => resolve())
  );

  router.get(PREPARE_TO_RESPOND_PATH, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await i18nReady;
      res.set('X-Robots-Tag', 'noindex');
      res.render('guidance/prepare-to-respond', prepareToRespondPage(req.query.lang));
    } catch (error) {
      next(error);
    }
  });

  // The application's built styles, scripts, fonts and images, so the page renders without the services above.
  router.use(express.static(publicDir));

  return router;
}
