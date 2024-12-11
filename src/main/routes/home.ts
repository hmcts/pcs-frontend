import axios from 'axios';
import { config } from 'config';
import { Application, Request, Response } from 'express';

declare module 'express-session' {
  export interface SessionData {
    views: number;
  }
}

export default function (app: Application): void {
  app.get('/', async (req: Request, res: Response) => {
    const apiResponse = await axios.get(config.get('api.url'));
    res.render('home', { apiResponse });
  });
}
