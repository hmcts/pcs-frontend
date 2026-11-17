import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { VIEW_THE_CLAIM_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';
import { getRequestLanguage, getTranslationFunction } from '../modules/i18n';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { isRespondToClaimEnabledForRelease } from '@utils/isRespondToClaimEnabledForUser';
import { RELEASE_1_4_ENABLED } from '@utils/respondToClaimFlags';
import { buildViewTheClaimPageData } from '@utils/viewTheClaim/viewTheClaimUtils';

export default function viewTheClaimRoutes(app: Application): void {
  app.get(VIEW_THE_CLAIM_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = req.params.caseReference as string;
    const accessToken = req.session?.user?.accessToken;

    if (!accessToken) {
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);
      const dashboardUrl = getDashboardUrl(caseReference);
      const t = getTranslationFunction(req, ['common', 'dashboard', 'viewTheClaim']);
      const language = getRequestLanguage(req);
      const rankedDefendantNumbering =
        (await isRespondToClaimEnabledForRelease(req)) && (await getLaunchDarklyFlag(req, RELEASE_1_4_ENABLED, false));

      res.render('view-the-claim', {
        ...buildViewTheClaimPageData(caseReference, ccdCase.data, t, language, rankedDefendantNumbering),
        dashboardUrl,
        backUrl: dashboardUrl,
      });
    } catch (error) {
      next(error);
    }
  });
}
