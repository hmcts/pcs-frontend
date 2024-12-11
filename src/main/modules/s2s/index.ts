import axios from 'axios';
import config from 'config';
import { Express, NextHandler, Request, Response } from 'express';
import otp from 'otp';

export class S2S {
  enableFor(app: Express): void {
    const microservice = config.get('s2s.microservice');
    const s2sSecret = config.get('secrets.pcs.pcs-frontend-s2s-secret');
    const s2sUrl = config.get('s2s.url');

    const oneTimePassword = otp({ secret: s2sSecret }).totp();

    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify({
        microservice,
        oneTimePassword,
      }),
    };

    app.use(async (req: Request, res: Response, next: NextHandler) => {
      //TODO: tidy up to use axios for fetch and also try/catch error handling
      if (!req.session.serviceToken) {
        const response = await fetch(`${s2sUrl}/lease`, options);
        req.session.serviceToken = await response.json();
      }
      axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${req.session.serviceToken}`;
      next();
    });
  }
}
