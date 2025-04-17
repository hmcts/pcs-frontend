import axios from 'axios';
import config from 'config';
import { Application, Request, Response } from 'express';

import { OIDCConfig } from '../modules/oidc/config.interface';

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
      const idamUrl = config.get('idam.url');
      // eslint-disable-next-line no-console
      console.log('idamUrl=> ', idamUrl);

      const oidcConfig = config.get('oidc') as OIDCConfig;

      const idamBody = new URLSearchParams({
        grant_type: 'password',
        redirect_uri: oidcConfig.redirectUri,
        client_id: oidcConfig.clientId,
        username: config.get('secrets.pcs.idam-system-user-name'),
        password: config.get('secrets.pcs.idam-system-user-password'),
        client_secret: config.get('secrets.pcs.pcs-frontend-idam-secret'),
        scope: oidcConfig.scope,
      });

      const tokenResponse = await axios.post(`${idamUrl}/o/token`, idamBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const accessToken = tokenResponse.data.access_token;

      const pcsUrl = config.get('api.url');
      // eslint-disable-next-line no-console
      console.log('url => ', `${pcsUrl}/courts?postcode=${encodeURIComponent(postcode)}`);

      const response = await axios.get(`${pcsUrl}/courts?postcode=${encodeURIComponent(postcode)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
  });
}
