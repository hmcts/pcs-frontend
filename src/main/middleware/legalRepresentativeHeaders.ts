import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import config from 'config';
import { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils';

export const legalRepresentativeHeaderMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const isLegalRepresentative = isLegalRepresentativeUser(req);
  let headerModel, footerModel;

  if (isLegalRepresentative) {
    const roles = req.session?.user?.roles;
    const xuiBaseUri: string = process.env.XUI_BASE_URI || config.get('xui.uri');

    headerModel = buildHeaderModel({
      xuiBaseUrl: xuiBaseUri,
      user: { roles: roles as string[] },
    });

    // Override default assetsPath
    headerModel.assetsPath = '/assets/ui-component-lib';

    footerModel = buildFooterModel();

    res.locals.extraHeaders = {
      headerModel,
      footerModel,
      isLegalRepresentative,
    };
  }

  next();
};
