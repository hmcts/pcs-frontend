import { Application, Request, Response } from 'express';

export default function (app: Application): void {
  app.get('/postcode', (req: Request, res: Response) => {
    res.render('postcode');
  });
}
