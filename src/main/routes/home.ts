import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function (app: Application): void {
  app.get('/', oidcMiddleware, (_req: Request, res: Response) => {
    res.redirect('/claims');
  });
}
