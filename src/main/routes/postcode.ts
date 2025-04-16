import axios from 'axios';
import { Application, Request, Response } from 'express';

const { Logger } = require('@hmcts/nodejs-logging');

export default function (app: Application): void {
  app.get('/postcode', (req: Request, res: Response) => {
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
      const s2sToken = req.session.serviceToken;
      // eslint-disable-next-line no-console
      console.log(
        'url => ',
        `https://pcs-api-pr-148.preview.platform.hmcts.net/courts?postCode=${encodeURIComponent(postcode)}`
      );

      const response = await axios.get(
        `https://pcs-api-pr-148.preview.platform.hmcts.net/courts?postCode=${encodeURIComponent(postcode)}`,
        {
          headers: {
            Authorization: `Bearer ${s2sToken}`,
          },
        }
      );
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
  });
}
