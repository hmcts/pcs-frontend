import * as path from 'path';

import * as propertiesVolume from '@hmcts/properties-volume';
import config from 'config';
import { get, set } from 'lodash';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('properties-volume');

export class PropertiesVolume {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  async enableFor(): Promise<void> {
    if (!this.developmentMode) {
      propertiesVolume.addTo(config);
    } else if (process.env.USE_VAULT !== 'false') {
      try {
        await propertiesVolume.addFromAzureVault(config, {
          pathToHelmChart: path.resolve(__dirname, '../../../../charts/pcs-frontend/values.yaml'),
          env: process.env.VAULT_ENV ?? 'aat',
          // AAT Redis isn't reachable from a dev laptop; keep the local default.
          // LOCAL ONLY — do not commit: pointing PCQ at demo, so take the token key from
          // .env (PCQ_TOKEN_KEY) instead of letting the AAT vault value overwrite it.
          omit: ['redis-connection-string', 'pcs-pcq-token-key'],
        });
      } catch (err) {
        logger.warn(
          `Could not load secrets from Azure Key Vault: ${(err as Error).message}. ` +
            'Falling back to values from .env / process.env. Run `az login` or set USE_VAULT=false to silence.'
        );
      }
    }
    if (config.has('secrets.pcs')) {
      this.setSecret('secrets.pcs.app-insights-connection-string', 'appInsights.connectionString');
    }
  }

  private setSecret(fromPath: string, toPath: string): void {
    if (config.has(fromPath)) {
      set(config, toPath, get(config, fromPath));
    }
  }
}
