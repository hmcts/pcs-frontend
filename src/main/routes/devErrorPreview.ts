import type { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';

// Temporary route to preview error pages in preview environment. Not intended for production use.
export default function (app: Application): void {
  app.get('/dev/error/:status', (req: Request, _res: Response, next: NextFunction) => {
    const statusCode = Number(req.params.status);
    const retryAfter = typeof req.query.retryAfter === 'string' ? req.query.retryAfter : undefined;
    next(new HTTPError('Dev preview', statusCode, retryAfter));
  });
}
