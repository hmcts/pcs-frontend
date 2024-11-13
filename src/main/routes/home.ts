import { Application, type Request, type Response } from 'express';

declare module 'express-session' {
  export interface SessionData {
    views: number;
  }
}

export default function (app: Application): void {
  app.get('/', (req: Request, res: Response) => {
    if (req.session.views) {
      req.session.views++;
    } else {
      req.session.views = 1;
    }

    res.render('home', { views: req.session.views });
  });
}
