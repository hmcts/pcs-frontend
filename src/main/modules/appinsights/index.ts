import * as appInsights from 'applicationinsights';
import config from 'config';

export class AppInsights {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(): void {
    if (config.get<string>('secrets.pcs.app-insights-connection-string') && !this.developmentMode) {
      appInsights.setup(config.get<string>('secrets.pcs.app-insights-connection-string')).setSendLiveMetrics(true);

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'pcs-frontend';
      appInsights.start();
    }
  }
}
