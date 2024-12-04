import { Application, type Request } from 'express';

declare module 'express-session' {
  export interface SessionData {
    views: number;
  }
}

export default function (app: Application): void {
  app.get('/', (req: Request) => {
    if (req.session.views) {
      return;
    } else {
      return;
    }
  });
}
