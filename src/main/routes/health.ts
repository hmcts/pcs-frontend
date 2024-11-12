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
        app.locals.redisClient.ping((err: typeof Error | null, response: string) => {
          console.log(err, response);
          return healthcheck.up();
          // if (err) {
          //   console.error('Redis health check failed:', err);
          //   return healthcheck.down();
          // }

          // console.log('Redis health check response:', response);
          // return response === 'PONG' ? healthcheck.up() : healthcheck.down();
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
