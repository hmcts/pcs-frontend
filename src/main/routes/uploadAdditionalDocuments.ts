import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function uploadAdditionalDocumentsRoutes(app: Application): void {
  app.get('/case/:caseReference/upload-additional-documents', oidcMiddleware, (req: Request, res: Response) => {
    res.render('upload-additional-documents');
  });
}
