import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { getRootGreeting } from '../services/pcsApi/pcsApiService';

export default function (app: Application): void {
  app.get('/', oidcMiddleware, async (req: Request, res: Response) => {
    let apiGreeting = 'default value';
    //console.log('user => ', JSON.stringify(req.session.user, null, 2));

    const landingGreeting: string = `${req.session.user?.given_name} ${new Date().toDateString()}`;

    try {
      apiGreeting = await getRootGreeting();
    } catch (error) {
      // console.error('pcs-api error', error.response.statusText);
    }

    res.render('home', { apiResponse: apiGreeting, landingGreeting });
  });
}
