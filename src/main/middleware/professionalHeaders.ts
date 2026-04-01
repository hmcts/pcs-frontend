import { NextFunction, Request, RequestHandler, Response } from 'express';
import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import * as jose from 'jose';

const footerModel = buildFooterModel();


export const professionalHeaderMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {

    const decoded = jose.decodeJwt(req.session.user!.idToken);

    const headerModel = buildHeaderModel({
      xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal', // TODO move to env
      user: { roles: <string[]>decoded.roles },
    });
    // Override default assetsPath to match where webpack copies the assets
    headerModel.assetsPath = '/assets/ui-component-lib';

    res.locals.extraHeaders = {
      headerModel: headerModel,
      footerModel: footerModel,
  };

  next();

};
