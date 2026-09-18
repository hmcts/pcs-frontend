import type { Application, Request, Response } from 'express';

import { legalRepresentativeHeaderMiddleware } from '../middleware';

const FOOTER_PATHS = ['/accessibility', '/privacy-policy', '/cookies', '/terms-and-conditions', '/get-help'];

const footerPages = [
  { path: '/accessibility', view: 'footer/accessibility', title: 'Accessibility Statement' },
  { path: '/privacy-policy', view: 'footer/privacy-policy', title: 'Privacy Policy' },
  { path: '/cookies', view: 'footer/cookies', title: 'Cookies' },
  { path: '/terms-and-conditions', view: 'footer/terms-and-conditions', title: 'Terms and Conditions' },
  { path: '/get-help', view: 'footer/get-help', title: 'Get Help' },
] as const;

export default function footerPagesRoutes(app: Application): void {
  app.use(FOOTER_PATHS, legalRepresentativeHeaderMiddleware);

  footerPages.forEach(page => {
    app.get(page.path, (req: Request, res: Response) => {
      if (!res.locals.isLegalRepresentative && !res.locals.release1dot3Enabled) {
        return res.status(404).render('not-found');
      }

      res.render(page.view, {
        title: page.title,
        t: req.i18n?.t || ((key: string) => key),
      });
    });
  });
}
