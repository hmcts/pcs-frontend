import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function viewAllApplicationsRoutes(app: Application): void {
  app.get('/case/:caseReference/view-all-applications', oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-all-applications');
  });
}
