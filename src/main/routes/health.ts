import { app as myApp } from '../app';

import healthcheck from '@hmcts/nodejs-healthcheck';
import { Logger } from '@hmcts/nodejs-logging';
import appInsights from 'applicationinsights';
import config from 'config';
import { Application } from 'express';
import { OK } from 'http-status-codes';

const healthTimeout: number = config.get('health.timeout');
const healthDeadline: number = config.get('health.deadline');

const apiUrl: string = config.get('api.url');
const apiHealthUrl = `${apiUrl}/health`;

const healthOptions = (message: string) => {
  return {
    callback: (error: Error, res: Response) => {
      if (error) {
        appInsights.defaultClient.trackTrace(`health_check_error: ${message} and error: ${error}`);
      }
      return !error && res.status === OK ? healthcheck.up() : healthcheck.down(error);
    },
    timeout: healthTimeout,
    deadline: healthDeadline,
  };
};

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function (app: Application): void {
  const logger = Logger.getLogger('health');

  const healthCheckConfig = {
    checks: {
      redis: healthcheck.raw(() => {
        return app.locals.redisClient
          .ping()
          .then((_: string) => {
            return healthcheck.status(_ === 'PONG');
          })
          .catch((error: typeof Error) => {
            logger.errorWithReq(null, 'health_check_error', 'Health check failed on redis', error);
            return false;
          });
      }),
      'pcs-api': healthcheck.web(apiHealthUrl, healthOptions('Health check failed on pcs-api:')),
    },
    readinessChecks: {
      shutdownCheck: healthcheck.raw(() => {
        return shutdownCheck() ? healthcheck.down() : healthcheck.up();
      }),
    },
  };

  healthcheck.addTo(app, healthCheckConfig);
}
