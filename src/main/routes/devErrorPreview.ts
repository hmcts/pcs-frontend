import type { Application, Request, Response, NextFunction } from 'express';
import { HTTPError } from '../HttpError';

// This route is used to preview error pages in development mode
export default function (app: Application): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  app.get('/dev/error/:status', (req: Request, _res: Response, next: NextFunction) => {
    const statusCode = Number(req.params.status);
    next(new HTTPError('Dev preview', statusCode));
  });
}