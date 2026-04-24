import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function hearingsRoutes(app: Application): void {
  app.get(
    '/dashboard/:caseReference/hearing/Defendant.ViewHearingDocuments',
    oidcMiddleware,
    (req: Request, res: Response) => {
      res.render('view-hearing-documents');
    }
  );
}
