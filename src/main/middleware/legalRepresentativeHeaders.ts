import { NextFunction, Request, RequestHandler, Response } from 'express';
import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import { isLegalRepresentativeUser } from '../steps/utils'

export const legalRepresentativeHeaderMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const shouldAddHeaders = isLegalRepresentativeUser(req);

  let headerModel, footerModel;

  if (shouldAddHeaders) {
    const roles = req.session?.user?.roles;

    headerModel = buildHeaderModel({
      xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal', // TODO move to env
      user: { roles: roles as string[] },
    });

    // Override default assetsPath
    headerModel.assetsPath = '/assets/ui-component-lib';

    footerModel = buildFooterModel();
  }

  res.locals.extraHeaders = {
    ...(shouldAddHeaders && { headerModel }),
    ...(shouldAddHeaders && { footerModel }),
    isLegalRepresentative: shouldAddHeaders,
  };

  next();
};
