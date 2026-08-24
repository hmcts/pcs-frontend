import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import config from 'config';
import { Application, Request, Response } from 'express';

import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { judgeAccessMiddleware, oidcMiddleware } from '../middleware';
import { getUserRoles } from '../steps/utils';

export default function makeOrderRoutes(app: Application): void {
  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, judgeAccessMiddleware, (req: Request, res: Response) => {
    const roles = getUserRoles(req);

    // Build the judicial menu directly because legalRepresentativeHeaderMiddleware requires a solicitor role.
    const headerModel = buildHeaderModel({
      xuiBaseUrl: config.get('xui.uri'),
      user: { roles },
    });
    headerModel.assetsPath = '/assets/ui-component-lib';

    res.render('make-order', { headerModel, footerModel: buildFooterModel() });
  });
}
