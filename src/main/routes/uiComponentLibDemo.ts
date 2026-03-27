import type { Application, Request, Response } from 'express';
import {
  buildFooterModel,
  buildHeaderModel,
} from '@hmcts-cft/cft-ui-component-lib';

export default function uiComponentLibDemoRoutes(app: Application): void {
  app.get('/demo/ui-component-lib', (_req: Request, res: Response) => {
    const headerModel = buildHeaderModel({
      xuiBaseUrl: process.env.XUI_BASE_URL ?? 'http://localhost:3000',
      user: {
          roles: ['caseworker-pcs'],
      },
    });
    res.render('uiComponentLibraryDemo', {
      headerModel,
      footerModel: buildFooterModel(),
    });
  });
}
