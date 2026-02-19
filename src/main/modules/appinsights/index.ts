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
    const connectionString = config.get<string>('secrets.pcs.app-insights-connection-string');
    if (connectionString && !this.developmentMode) {
      // If bootstrap already ran (via --require), skip to avoid duplicate setup
      if (!(process as NodeJS.Process & { __appInsightsBootstrapped?: boolean }).__appInsightsBootstrapped) {
        this.logger.info('Enabling Application Insights', { connectionString });
        appInsights.setup(connectionString).setSendLiveMetrics(true);
        appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'pcs-frontend';
        appInsights.start();
        this.logger.info('Application Insights enabled');
      } else {
        this.logger.info('Application Insights already initialized (via bootstrap)');
      }
    }
  }
}
