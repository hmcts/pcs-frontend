<<<<<<< HEAD
<<<<<<< HEAD
import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';
=======
=======
import { app as myApp } from '../app';

>>>>>>> da49f45 (Linting fixes)
import config from 'config';
import { Application } from 'express';
import { OK } from 'http-status-codes';
>>>>>>> 227da3d (HDPI-359: fixing the unit test and build errors)

const healthcheck = require('@hmcts/nodejs-healthcheck');

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function (app: Application): void {
  const logger = Logger.getLogger('health');

  const healthCheckConfig = {
    checks: {
      redis: healthcheck.raw(() => {
        if (!app.locals.redisClient) {
          return Promise.resolve(false);
        }
        return app.locals.redisClient
          .ping()
          .then((_: string) => {
            return healthcheck.status(_ === 'PONG');
          })
          .catch((error: Error) => {
            logger.errorWithReq(null, 'health_check_error', 'Health check failed on redis', error);
            return healthcheck.status(false);
          });
      }),
    },
    readinessChecks: {
      shutdownCheck: healthcheck.raw(() => {
        return shutdownCheck() ? healthcheck.down() : healthcheck.up();
      }),
    },
  };

  healthcheck.addTo(app, healthCheckConfig);
}
