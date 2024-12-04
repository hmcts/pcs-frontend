import { Application, type Response } from 'express';

declare module 'express-session' {
  export interface SessionData {
    views: number;
  }
}

export default function (app: Application): void {
  app.get('/', (res: Response) => {

    res.render('home',);
  });
}
