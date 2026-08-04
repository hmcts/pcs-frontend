import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function hearingsRoutes(app: Application): void {
  app.get('/case/:caseReference/view-hearing-documents', oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-hearing-documents');
  });
}
