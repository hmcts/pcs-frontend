import { NextFunction, Request, RequestHandler, Response } from 'express';
import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import * as jose from 'jose';
import { isProfessionalJourney } from 'steps/utils/isProfessionalJourney';


export const professionalHeaderMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const isProfessional = isProfessionalJourney(req);

  let headerModel, footerModel;

  if (isProfessional) {
    const decoded = jose.decodeJwt(req.session.user!.idToken);

    headerModel = buildHeaderModel({
      xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal', // TODO move to env
      user: { roles: decoded.roles as string[] },
    });

    // Override default assetsPath
    headerModel.assetsPath = '/assets/ui-component-lib';

    footerModel = buildFooterModel();
  }

  res.locals.extraHeaders = {
    ...(isProfessional && { headerModel }),
    ...(isProfessional && { footerModel }),
    isProfessional,
  };

  req.session.isProfessional = isProfessional;

  next();
};
