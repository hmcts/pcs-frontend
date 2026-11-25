import config from 'config';
import type { Application, Request, Response } from 'express';

import { legalRepresentativeHeaderMiddleware } from '../middleware';

const footerPages = [
  {
    path: '/accessibility',
    view: 'footer/accessibility',
    namespace: 'footer/accessibility',
  },
  {
    path: '/privacy-policy',
    view: 'footer/privacy-policy',
    namespace: 'footer/privacy-policy',
  },
  {
    path: '/cookies',
    view: 'footer/cookies',
    namespace: 'footer/cookies',
  },
  {
    path: '/terms-and-conditions',
    view: 'footer/terms-and-conditions',
    namespace: 'footer/terms-and-conditions',
  },
  {
    path: '/get-help',
    view: 'footer/get-help',
    namespace: 'footer/get-help',
  },
] as const;

export default function footerPagesRoutes(app: Application): void {
  app.use(
    footerPages.map(page => page.path),
    legalRepresentativeHeaderMiddleware
  );

  const lrFooterBaseUri: string = config.has('pcsFrontend.aatUri')
    ? config.get('pcsFrontend.aatUri')
    : 'https://pcs.aat.platform.hmcts.net';

  footerPages.forEach(page => {
    app.get(page.path, async (req: Request, res: Response) => {
      if (res.locals.isLegalRepresentative) {
        const targetUrl = new URL(page.path, lrFooterBaseUri);

        if (req.hostname !== targetUrl.hostname) {
          return res.redirect(targetUrl.toString());
        }
      }

      await req.i18n?.loadNamespaces([page.namespace]);

      const fixedT = req.i18n?.getFixedT(req.language || 'en', page.namespace);
      if (fixedT) {
        res.locals.t = fixedT;
      }

      res.render(page.view, {
        t: fixedT || req.i18n?.t || ((key: string) => key),
        ns: page.namespace,
        isLegalRepresentative: Boolean(res.locals.isLegalRepresentative),
      });
    });
  });
}
