import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function (app: Application): void {
  app.get('/case/:caseReference/view-the-claim', oidcMiddleware, (req: Request, res: Response) => {
    res.render('view-the-claim');
  });
}
