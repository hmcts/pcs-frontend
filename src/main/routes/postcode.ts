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
    const pcsApiURL = config.get('api.url');
    //const response = await axios.get(`${pcsApiURL}/courts?postCode=${encodeURIComponent(postcode)}`);
    const response = await axios.get(`${pcsApiURL}/health`);
    const courtData = response.data;

    const courtList = [
      {
        epimms_id: '20262',
        court_venue_id: '40821',
        court_name: 'Royal Courts of Justice (Main Building)',
      },
      {
        epimms_id: '20262',
        court_venue_id: '40822',
        court_name: 'Royal Courts of Justice - Thomas More Building',
      },
    ];

    const tableRows = courtList.map(court => [{ text: court.court_venue_id }, { text: court.court_name }]);
    res.render('courts-name', { courtData, tableRows });
  });
}
