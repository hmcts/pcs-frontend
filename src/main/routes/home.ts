import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

import { getRootGreeting } from '@services/pcsApi/pcsApiService';

export default function (app: Application): void {
  app.get('/', oidcMiddleware, async (req: Request, res: Response) => {
    let apiGreeting = 'default value';

    try {
      apiGreeting = await getRootGreeting();
    } catch {
      // console.error('pcs-api error', error.response.statusText);
    }

    res.render('home', { apiResponse: apiGreeting });
  });
}
