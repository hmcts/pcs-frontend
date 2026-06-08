import { Application, Request, Response } from 'express';

export default function (app: Application): void {
  app.get('/', (req: Request, res: Response) => {
    if (req.session?.user) {
      res.redirect('/claims');
    } else {
      res.redirect('/login');
    }
  });
}
