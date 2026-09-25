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

  footerPages.forEach(page => {
    app.get(page.path, async (req: Request, res: Response) => {
      if (!res.locals.isLegalRepresentative && !res.locals.release1dot3Enabled) {
        return res.status(404).render('not-found');
      }

      await req.i18n?.loadNamespaces([page.namespace]);

      res.render(page.view, {
        t: req.i18n?.t || ((key: string) => key),
      });
    });
  });
}
