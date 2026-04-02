import { NextFunction, Request, RequestHandler, Response } from 'express';
import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import * as jose from 'jose';
import { isProfessionalJourney } from 'steps/utils/isProfessionalJourney';

const footerModel = buildFooterModel();

export const professionalHeaderMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // if citizen
  // isCitizen
  const decoded = jose.decodeJwt(req.session.user!.idToken);

  const headerModel = buildHeaderModel({
    xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal', // TODO move to env
    user: { roles: <string[]>decoded.roles },
  });
  // Override default assetsPath to match where webpack copies the assets
  headerModel.assetsPath = '/assets/ui-component-lib';
  // const roles = <string []>decoded.roles;
  // const isProfessional = roles[0]!=='citizen';
  res.locals.extraHeaders = {
    headerModel: headerModel,
    footerModel: footerModel,
    isProfessional: isProfessionalJourney(req),
  };

  next();
};
