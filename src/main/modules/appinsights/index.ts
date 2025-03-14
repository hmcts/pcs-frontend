import appInsights from 'applicationinsights';
import config from 'config';

export class AppInsights {
  enable(): void {
    if (config.get<string>('secrets.pcs.app-insights-connection-string')) {
      appInsights.setup(config.get<string>('secrets.pcs.app-insights-connection-string')).setSendLiveMetrics(true);

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'pcs-frontend';
      appInsights.start();
    }
  }
}
