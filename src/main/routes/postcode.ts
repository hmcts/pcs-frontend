import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { getCourtVenues } from '../services/pcsApi/pcsApiService';

export default function (app: Application): void {
  app.get('/postcode',  oidcMiddleware, async(req: Request, res: Response) => {
    res.render('postcode', { fields: {} });
  });

  app.post('/postcode', async (req: Request, res: Response) => {
    const logger = Logger.getLogger('postcode');

    const postcode = req.body.postcode?.trim();

    if (!postcode) {
      return res.render('postcode', {
        fields: {
          postcode: {
            value: '',
            errorMessage: 'Please enter a postcode',
          },
        },
      });
    }

    try {
      if (!req.session?.user?.accessToken) {
        throw new Error('Access token missing from session');
      }

      const courtData = await getCourtVenues(postcode, req.session?.user);
      const tableRows = courtData.map(court => [{ text: court.id.toString() }, { text: court.name }]);
      res.render('courts.njk', { tableRows });
    } catch (error) {
      logger.error('Failed to fetch court data', {
        error: error?.message || error,
        stack: error?.stack,
        postcode,
      });

      return res.render('postcode', {
        fields: {
          postcode: {
            value: postcode,
            errorMessage: 'There was an error retrieving court data. Please try again later.',
          },
        },
      });
    }
  });
}
