import { Application, Request, Response } from 'express';

import { VIEW_THE_CLAIM_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

export default function viewTheClaimRoutes(app: Application): void {
  app.get(VIEW_THE_CLAIM_ROUTE, oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-the-claim');
  });
}
