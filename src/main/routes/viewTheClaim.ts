import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { VIEW_THE_CLAIM_ROUTE } from '../constants/caseRoutes';
import { getTranslationFunction } from '../modules/i18n';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import type { CcdCaseModel } from '@services/ccdCaseData.model';
import { buildViewTheClaimPageData } from '@utils/viewTheClaimUtils';

export default function viewTheClaimRoutes(app: Application): void {
  app.get(VIEW_THE_CLAIM_ROUTE, oidcMiddleware, (req: Request, res: Response, next: NextFunction) => {
    const validatedCase = res.locals.validatedCase as CcdCaseModel | undefined;
    const caseReference = validatedCase?.id || '';

    if (!validatedCase || !caseReference) {
      return next(new HTTPError('Invalid case reference format', 404));
    }

    const dashboardUrl = getDashboardUrl(caseReference);
    const t = getTranslationFunction(req, ['common', 'dashboard', 'viewTheClaim']);

    res.render('view-the-claim', {
      ...buildViewTheClaimPageData(caseReference, validatedCase.data, t),
      dashboardUrl,
      backUrl: dashboardUrl,
    });
  });
}
