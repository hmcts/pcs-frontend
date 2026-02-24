import * as propertiesVolume from '@hmcts/properties-volume';
import config from 'config';
import { Express } from 'express';
import { get, set } from 'lodash';

export class PropertiesVolume {
  enableFor(server: Express): void {
    if (server.locals.ENV !== 'development') {
      propertiesVolume.addTo(config);
      if (config.has('secrets.pcs')) {
        this.setSecret('secrets.pcs.app-insights-connection-string', 'secrets.pcs.app-insights-connection-string');
      }
    }
  }

  private setSecret(fromPath: string, toPath: string): void {
    if (config.has(fromPath)) {
      set(config, toPath, get(config, fromPath));
    }
  }
}
