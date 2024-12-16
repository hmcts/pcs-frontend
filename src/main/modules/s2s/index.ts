import axios from 'axios';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import { TOTP } from 'totp-generator';

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

    this.logger.info('s2sUrl', s2sUrl);
    this.logger.info('s2sSecret', s2sSecret);
    this.logger.info('microservice', microservice);


    app.use(async (req: Request, res: Response, next: NextFunction) => {

      const { otp } = TOTP.generate(s2sSecret);

      const params = {
        microservice,
        oneTimePassword: otp,
      };

      const data = await new Promise((resolve, reject) => {
        fetch(
          `${s2sUrl}/lease`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
          },
        )
          .then((res: any) => res.text())
          .then((token: string) => {
            resolve(token);
          })
          .catch((err: string) => {
            this.logger.error(err);
            reject(err);
          });
      });

      if (data) {
        this.logger.info('SERVICE TOKEN = ', s2sUrl, data);
        axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${data}`;
      }

      // let serviceToken = '';

      // // if (!req.session.serviceToken) {
      //   try {
      //     const { otp } = TOTP.generate(s2sSecret);
      //     this.logger.info('S2S oneTimePassword', otp);








      //     const response = await axios.post(`${s2sUrl}/lease`, {
      //       microservice,
      //       oneTimePassword: otp,
      //     });
      //     this.logger.info('S2S request status: ', response.status, response.statusText, response.data);
      //     serviceToken = response.data;
      //   } catch (error) {
      //     this.logger.error('S2S ERROR', error.response.data, error.message);
      //   }
      // // }

      // // if (req.session.serviceToken) {
      //   this.logger.info('SERVICE TOKEN = ', s2sUrl, serviceToken);
      //   axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${serviceToken}`;
      // // }
      next();
    });
  }
}
