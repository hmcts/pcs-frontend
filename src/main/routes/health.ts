import healthcheck from '@hmcts/nodejs-healthcheck';
import { Application } from 'express';

import { app as myApp } from '../app';

import { Logger } from '@modules/logger';

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function (app: Application): void {
  const logger = Logger.getLogger('health');

  const healthCheckConfig = {
    checks: {},
    readinessChecks: {
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
            logger.error('Health check failed on redis', error);
            return healthcheck.status(false);
          });
      }),
      shutdownCheck: healthcheck.raw(() => {
        return shutdownCheck() ? healthcheck.down() : healthcheck.up();
      }),
    },
  };

  healthcheck.addTo(app, healthCheckConfig);
}
