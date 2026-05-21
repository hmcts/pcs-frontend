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

  res.locals.isLegalRepresentative = isLegalRepresentative;

  if (isLegalRepresentative) {
    const roles = req.session?.user?.roles;
    const xuiBaseUri: string = config.get('xui.uri');

    const headerModel = buildHeaderModel({
      xuiBaseUrl: xuiBaseUri,
      user: { roles: roles as string[] },
    });

    // Override default assetsPath
    headerModel.assetsPath = '/assets/ui-component-lib';

    const footerModel = buildFooterModel();

    res.locals.headerModel = headerModel;
    res.locals.footerModel = footerModel;

  }

  next();
};
