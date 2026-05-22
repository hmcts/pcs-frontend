import { Application, Request, Response } from 'express';

import { VIEW_ALL_APPLICATIONS_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { sanitiseCaseReference } from '@utils/caseReference';

export default function viewAllApplicationsRoutes(app: Application): void {
  app.get(VIEW_ALL_APPLICATIONS_ROUTE, oidcMiddleware, (req: Request, res: Response) => {
    const rawRef = req.params?.caseReference;
    const caseReference =
      typeof rawRef === 'string' || typeof rawRef === 'number' ? sanitiseCaseReference(rawRef) : null;
    res.render('view-all-applications', {
      dashboardUrl: caseReference ? getDashboardUrl(caseReference) : null,
    });
  });
}
