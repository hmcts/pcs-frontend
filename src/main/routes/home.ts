import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { getRootGreeting } from '../services/pcsApi/pcsApiService';

export default function (app: Application): void {
  app.get('/', oidcMiddleware, async (req: Request, res: Response) => {
    let apiGreeting = 'default value';

    try {
      apiGreeting = await getRootGreeting();
    } catch (error) {
      // console.error('pcs-api error', error.response.statusText);
    }

    // Get details of logged in user.
    const user = req.session?.user;
    const givenName = user?.given_name;
    const familyName = user?.family_name;

    // Get time.
    const currentTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    res.render('home', { apiResponse: apiGreeting, givenName, familyName, currentTime });
  });
}
