import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { Application } from 'express';

const headerModel = buildHeaderModel({
  xuiBaseUrl: 'http://localhost:3209',
  user: { roles: ['caseworker-civil'] },
});
headerModel.assetsPath = '/assets/ui-component-lib';

const footerModel = buildFooterModel();

export default function (app: Application): void {
  app.get('/demo-xui', (_req, res) => {
    res.render('demo-xui', { headerModel, footerModel });
  });
}
