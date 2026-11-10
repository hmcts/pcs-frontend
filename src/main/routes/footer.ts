import config from 'config';
import type { Application, Request, Response } from 'express';

import { legalRepresentativeHeaderMiddleware } from '../middleware';

const footerPages = [
  {
    path: '/accessibility',
    pageName: 'accessibility',
    exuiPath: '/accessibility',
  },
  {
    path: '/privacy-policy',
    pageName: 'privacy-policy',
    exuiPath: '/privacy-policy',
  },
  {
    path: '/cookies',
    pageName: 'cookies',
    exuiPath: '/cookies',
  },
  {
    path: '/terms-and-conditions',
    pageName: 'terms-and-conditions',
    exuiPath: '/legacy-terms-and-conditions',
  },
  {
    path: '/get-help',
    pageName: 'get-help',
    exuiPath: '/get-help',
  },
] as const;

export default function footerPagesRoutes(app: Application): void {
  app.use(
    footerPages.map(page => page.path),
    legalRepresentativeHeaderMiddleware
  );

  const xuiBaseUri: string = config.get('xui.uri');

  footerPages.forEach(page => {
    app.get(page.path, async (req: Request, res: Response) => {
      res.locals.isLegalRepresentative = true;
      if (res.locals.isLegalRepresentative) {
        const redirectUrl = new URL(page.exuiPath, xuiBaseUri).toString();
        return res.redirect(redirectUrl);
      }

      const viewPath = `footer/${page.pageName}`;
      const namespace = `footer/${page.pageName}`;

      await req.i18n?.loadNamespaces([namespace]);

      const fixedT = req.i18n?.getFixedT(req.language || 'en', namespace);
      if (fixedT) {
        res.locals.t = fixedT;
      }

      res.render(viewPath, {
        t: fixedT || req.i18n?.t || ((key: string) => key),
        ns: namespace,
        isLegalRepresentative: false,
      });
    });
  });
}
