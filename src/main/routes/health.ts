import { app as myApp } from '../app';

import { Application } from 'express';

const healthcheck = require('@hmcts/nodejs-healthcheck');

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function (app: Application): void {
  const healthCheckConfig = {
    checks: {
      redis: healthcheck.raw(() => {
        if (app.locals.redisClient) {
          app.locals.redisClient.ping((err: typeof Error, response: string) => console.log(err, response));
          return app.locals.redisClient.ping() ? healthcheck.up() : healthcheck.down();
        }
        return healthcheck.up();
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
