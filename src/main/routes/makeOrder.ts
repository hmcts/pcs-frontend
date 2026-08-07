import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import config from 'config';
import { Application, Request, Response } from 'express';

import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { judgeAccessMiddleware, oidcMiddleware } from '../middleware';
import { getUserRoles } from '../steps/utils';

export default function makeOrderRoutes(app: Application): void {
  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, judgeAccessMiddleware, (req: Request, res: Response) => {
    const roles = getUserRoles(req);

    // Judges only, so the xui chrome is unconditional. legalRepresentativeHeaderMiddleware is not
    // used here: it gates on the solicitor role, which a judge does not have, so it would leave
    // the header model undefined. The menu the header renders still comes from the user's roles.
    const headerModel = buildHeaderModel({
      xuiBaseUrl: config.get('xui.uri'),
      user: { roles },
    });
    headerModel.assetsPath = '/assets/ui-component-lib';

    res.render('make-order', { headerModel, footerModel: buildFooterModel() });
  });
}
