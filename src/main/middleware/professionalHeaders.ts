import { NextFunction, Request, RequestHandler, Response } from 'express';
import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';

const headerModel = buildHeaderModel({
  xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal', // TODO move to env
  user: { roles: ['caseworker-civil'] },
});
// Override default assetsPath to match where webpack copies the assets
headerModel.assetsPath = '/assets/ui-component-lib';

const footerModel = buildFooterModel();


export const professionalHeaderMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {

    res.locals.extraHeaders = {
      headerModel: headerModel,
      footerModel: footerModel,
  };

  next();

};
