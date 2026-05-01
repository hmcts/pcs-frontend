import { Application, Request, Response } from 'express';

import { VIEW_DOCUMENTS_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

export default function documentsRoutes(app: Application): void {
  app.get(VIEW_DOCUMENTS_ROUTE, oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-documents');
  });
}
