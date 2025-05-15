import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';
import { Express, Response as ExpressResponse, NextFunction, Request } from 'express';
import { TOTP } from 'totp-generator';

import { type S2SConfig } from './s2s.interface';

export class S2S {
  logger = Logger.getLogger('s2s');

  enableFor(app: Express): void {
    const s2sSecret = config.get<string>('secrets.pcs.pcs-frontend-s2s-secret');

    const { microservice, url: s2sUrl, key: s2sKey, ttl: s2sTtl } = config.get<S2SConfig>('s2s');

    const redisClient = app.locals.redisClient;

    app.use(async (req: Request, res: ExpressResponse, next: NextFunction) => {
      try {
        // Try to get token from Redis first
        let serviceToken: string | null = await redisClient?.get(s2sKey);

        if (!serviceToken) {
          const { otp } = TOTP.generate(s2sSecret);

          const params = {
            microservice,
            oneTimePassword: otp,
          };

          const request = new Promise<string>((resolve, reject) => {
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
            serviceToken = await request;
            // Store token in Redis with expiry so it is automatically removed after TTL
            await redisClient?.set(s2sKey, serviceToken, 'EX', s2sTtl);
          } catch (error) {
            this.logger.error('S2S ERROR', error.message);
          }
        }

        const currentHeader = axios.defaults.headers.common['ServiceAuthorization'];

        if (serviceToken && currentHeader !== `Bearer ${serviceToken}`) {
          // Only set the header if it's not already set with the same token
          axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${serviceToken}`;
        }

        next();
      } catch (error) {
        this.logger.error('Error in S2S middleware:', error);
        next(error);
      }
    });
  }
}
