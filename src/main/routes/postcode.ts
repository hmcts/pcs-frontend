import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { getCourtVenues } from '../services/pcsApi/pcsApiService';

export default function (app: Application): void {
  app.get('/postcode', oidcMiddleware, async (req: Request, res: Response) => {
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
      const pcsApiURL = config.get('api.url');
      const s2sToken = req.session.serviceToken;
      // eslint-disable-next-line no-console
      console.log('url => ', `${pcsApiURL}/courts?postCode=${encodeURIComponent(postcode)}`);

      const response = await axios.get(`${pcsApiURL}/courts?postCode=${encodeURIComponent(postcode)}`, {
        headers: {
          Authorization: `Bearer ${s2sToken}`,
        },
      });
      // eslint-disable-next-line no-console
      console.log('response => ', response);
      const courtData = response.data;

      const tableRows = courtData?.map((court: { court_venue_id: string; court_name: string }) => [
        { text: court.court_venue_id },
        { text: court.court_name },
      ]);
      res.render('courts-name', { tableRows });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('error: ', error);
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
>>>>>>> 7002c57 (fixing unit test and sonar qube error)
  });
}
