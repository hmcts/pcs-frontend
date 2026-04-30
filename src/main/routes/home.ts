import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

import { safeRedirect303 } from '@utils/safeRedirect';

export default function (app: Application): void {
  app.get('/', oidcMiddleware, (req: Request, res: Response) => {
    return safeRedirect303(res, '/access-your-case', '/', ['/access-your-case']);
  });
}
