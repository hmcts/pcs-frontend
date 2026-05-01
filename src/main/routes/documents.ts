import { Application, Request, Response } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE, VIEW_DOCUMENTS_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

export default function documentsRoutes(app: Application): void {
  app.get(UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE, oidcMiddleware, (req: Request, res: Response) => {
    res.render('upload-additional-documents');
  });
  app.get(VIEW_DOCUMENTS_ROUTE, oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-documents');
  });
}
