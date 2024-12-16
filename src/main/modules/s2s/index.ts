import axios from 'axios';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import otp from 'otp';

declare module 'express-session' {
  export interface SessionData {
    serviceToken: string;
  }
}

const { Logger } = require('@hmcts/nodejs-logging');

export class S2S {
  logger = Logger.getLogger('s2s');
  enableFor(app: Express): void {
    const microservice = config.get('s2s.microservice');
    const s2sSecret = config.get<string>('secrets.pcs.pcs-frontend-s2s-secret');
    const s2sUrl = config.get('s2s.url');

    const oneTimePassword = new otp({ secret: s2sSecret }).totp(0);
    this.logger.info('S2S oneTimePassword', oneTimePassword);
    this.logger.info('s2sUrl', s2sUrl);
    this.logger.info('s2sSecret', s2sSecret);
    this.logger.info('microservice', microservice);


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

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session.serviceToken) {
        try {
          const response = await fetch(`${s2sUrl}/lease`, options);
          req.session.serviceToken = await response.json();
        } catch (error) {
          this.logger.error('S2S ERROR', error.response);
        }
      }

      if (req.session.serviceToken) {
        this.logger.info('SERVICE TOKEN = ', s2sUrl, req.session.serviceToken, options);
        axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${req.session.serviceToken}`;
      }
      next();
    });
  }
}
