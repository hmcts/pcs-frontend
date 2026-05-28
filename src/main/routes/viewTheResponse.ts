import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function viewTheResponseRoutes(app: Application): void {
  app.get('/case/:caseReference/view-the-response', oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-the-response');
  });
}
