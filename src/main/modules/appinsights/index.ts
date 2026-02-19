import { Logger } from '@hmcts/nodejs-logging';
import * as appInsights from 'applicationinsights';
import config from 'config';

export class AppInsights {
  logger = Logger.getLogger('appinsights');

  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
    this.logger.info('AppInsights constructor', { developmentMode });
  }

  enableFor(): void {
    // if (config.get<string>('secrets.pcs.app-insights-connection-string') && !this.developmentMode) {
    this.logger.info('Enabling Application Insights');
    this.logger.info('Application Insights connection string', {
      connectionString: config.get<string>('secrets.pcs.app-insights-connection-string'),
    });
    appInsights.setup(config.get<string>('secrets.pcs.app-insights-connection-string')).setSendLiveMetrics(true);

    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'pcs-frontend';
    appInsights.start();
    this.logger.info('Application Insights enabled');
    // }
  }
}
