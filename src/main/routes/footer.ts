import type { Application, Request, Response } from 'express';

import { legalRepresentativeHeaderMiddleware } from '../middleware';

const FOOTER_PATHS = ['/accessibility', '/privacy-policy', '/cookies', '/terms-and-conditions', '/get-help'];

export default function footerPagesRoutes(app: Application): void {
  app.use(FOOTER_PATHS, legalRepresentativeHeaderMiddleware);

  app.get('/accessibility', (req: Request, res: Response) => {
    res.render('footer/accessibility', {
      title: 'Accessibility Statement',
      t: req.i18n?.t || ((key: string) => key),
    });
  });

  app.get('/privacy-policy', (req: Request, res: Response) => {
    res.render('footer/privacy-policy', {
      title: 'Privacy Policy',
      t: req.i18n?.t || ((key: string) => key),
    });
  });

  app.get('/cookies', (req: Request, res: Response) => {
    res.render('footer/cookies', {
      title: 'Cookies',
      t: req.i18n?.t || ((key: string) => key),
    });
  });

  app.get('/terms-and-conditions', (req: Request, res: Response) => {
    res.render('footer/terms-and-conditions', {
      title: 'Terms and Conditions',
      t: req.i18n?.t || ((key: string) => key),
    });
  });

  app.get('/get-help', (req: Request, res: Response) => {
    res.render('footer/get-help', {
      title: 'Get Help',
      t: req.i18n?.t || ((key: string) => key),
    });
  });
}
