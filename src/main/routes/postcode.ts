<<<<<<< HEAD
import { Logger } from '@hmcts/nodejs-logging';
=======
import axios from 'axios';
import config from 'config';
>>>>>>> ace1866 (HDPI-515: update the pcs url to preview)
import { Application, Request, Response } from 'express';

<<<<<<< HEAD
import { oidcMiddleware } from '../middleware';
import { getCourtVenues } from '../services/pcsApi/pcsApiService';
=======
import { OIDCConfig } from '../modules/oidc/config.interface';

const { Logger } = require('@hmcts/nodejs-logging');
>>>>>>> e69b427 (HDPI-515: adding idam user token to the postcode api)

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
      const courtData = await getCourtVenues(postcode);
      
      const tableRows = courtData.map(court => [
        { text: court.epimId.toString() },
        { text: court.id.toString() },
        { text: court.name },
      ]);

      res.render('courts.njk', { tableRows });
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
