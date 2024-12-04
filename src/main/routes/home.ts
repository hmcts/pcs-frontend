import { Application, Request, Response } from 'express';

declare module 'express-session' {
  export interface SessionData {
    views: number;
  }
}

export default function (app: Application): void {
  app.get('/', (req: Request, res: Response) => {
    res.render('home');
  });
}
