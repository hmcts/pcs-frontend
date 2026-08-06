import { Application, Request, Response } from 'express';

import { MAKE_ORDER_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';
import { legalRepresentativeHeaderMiddleware } from '../middleware/legalRepresentativeHeaders';

export default function makeOrderRoutes(app: Application): void {
  app.get(MAKE_ORDER_ROUTE, oidcMiddleware, legalRepresentativeHeaderMiddleware, (req: Request, res: Response) => {
    res.render('make-order');
  });
}
