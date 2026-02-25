import * as propertiesVolume from '@hmcts/properties-volume';
import config from 'config';
import { get, set } from 'lodash';

export class PropertiesVolume {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(): void {
    if (this.developmentMode) {
      propertiesVolume.addTo(config);
      if (config.has('secrets.pcs')) {
        this.setSecret('secrets.pcs.app-insights-connection-string', 'appInsights.connectionString');
      }
    }
  }

  private setSecret(fromPath: string, toPath: string): void {
    if (config.has(fromPath)) {
      set(config, toPath, get(config, fromPath));
    }
  }
}
