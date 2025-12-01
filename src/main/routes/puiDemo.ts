import { Application, Request, Response } from 'express';

export default function (app: Application): void {
  app.get('/pui-demo', (req: Request, res: Response) => {
    res.render('pui-demo');
  });
}
