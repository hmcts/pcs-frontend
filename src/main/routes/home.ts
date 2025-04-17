import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { PcsApiClient } from '../modules/pcs-api-client';

export default function (app: Application): void {
  const pcsApiClient: PcsApiClient = new PcsApiClient();

  app.get('/', oidcMiddleware, async (req: Request, res: Response) => {
    let apiGreeting = 'default value';

    try {
      apiGreeting = await pcsApiClient.getRootGreeting();
    } catch (error) {
      // console.error('pcs-api error', error.response.statusText);
    }

    res.render('home', { apiResponse: apiGreeting });
  });
}
