import * as propertiesVolume from '@hmcts/properties-volume';
import config from 'config';
import { Express } from 'express';
import { get, set } from 'lodash';

export class PropertiesVolume {
  enableFor(server: Express): void {
    if (server.locals.ENV !== 'development') {
      // Skip addTo if bootstrap already ran it (before config.get freezes config).
      // See bootstrap.cjs for the ordering issue.
      if (!(process as NodeJS.Process & { __propertiesVolumeLoaded?: boolean }).__propertiesVolumeLoaded) {
        propertiesVolume.addTo(config);
      }

      this.setSecret('secrets.pcs.AppInsightsInstrumentationKey', 'appInsights.instrumentationKey');
    }
  }

  private setSecret(fromPath: string, toPath: string): void {
    if (config.has(fromPath)) {
      set(config, toPath, get(config, fromPath));
    }
  }
}
