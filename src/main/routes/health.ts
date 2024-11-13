import { app as myApp } from '../app';

import { Application } from 'express';

const healthcheck = require('@hmcts/nodejs-healthcheck');
const { Logger } = require('@hmcts/nodejs-logging');

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function (app: Application): void {
  const logger = Logger.getLogger('health');
  const healthCheckConfig = {
    checks: {
      redis: healthcheck.raw(() => {
        app.locals.redisClient.ping((err: typeof Error | null, response: string) => {
          if (err) {
            logger.error('Redis health check failed:', err);
            return healthcheck.down();
          }
          logger.info('redis ping response', response);
          return response === 'PONG' ? healthcheck.up() : healthcheck.down();
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
