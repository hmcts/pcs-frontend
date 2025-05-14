import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';
import { Express, Response as ExpressResponse, NextFunction, Request } from 'express';
import { TOTP } from 'totp-generator';

export class S2S {
  logger = Logger.getLogger('s2s');
  enableFor(app: Express): void {
    const microservice = config.get('s2s.microservice');
    const s2sSecret = config.get<string>('secrets.pcs.pcs-frontend-s2s-secret');
    const s2sUrl = config.get('s2s.url');

    app.use(async (req: Request, res: ExpressResponse, next: NextFunction) => {
      if (!req.app.locals.serviceToken) {
        const { otp } = TOTP.generate(s2sSecret);

        const params = {
          microservice,
          oneTimePassword: otp,
        };

        const request = new Promise((resolve, reject) => {
          fetch(`${s2sUrl}/lease`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
          })
            .then(response => {
              return response.status === 200
                ? response
                : response.text().then(text => {
                    this.logger.error('FETCH ERR: ', response.status, text);
                    return Promise.reject(new Error(text));
                  });
            })
            .then(response => response.text())
            .then((token: string) => {
              resolve(token);
            })
            .catch((err: string) => {
              this.logger.error(err);
              reject(err);
            });
        });

        try {
          req.app.locals.serviceToken = (await request) as string;
        } catch (error) {
          this.logger.error('S2S ERROR', error.message);
        }
      }

      if (req.app.locals.serviceToken) {
        axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${req.app.locals.serviceToken}`;
      }
      next();
    });
  }
}
