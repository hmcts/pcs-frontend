import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function noticesRoutes(app: Application): void {
  app.get('/dashboard/:caseReference/notice/Defendant.ViewOrdersAndNotices', oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-orders-and-notices');
  });
}