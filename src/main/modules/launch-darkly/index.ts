import path from 'node:path';

import { Logger } from '@hmcts/nodejs-logging';
import { type LDClient, type LDOptions, init } from '@launchdarkly/node-server-sdk';
// eslint-disable-next-line import/no-unresolved
import { FileDataSourceFactory } from '@launchdarkly/node-server-sdk/integrations';
import config from 'config';
import * as express from 'express';

export class LaunchDarkly {
  private readonly logger = Logger.getLogger('launch-darkly');

  public async enableFor(app: express.Express): Promise<void> {
    const options: LDOptions = {
      logger: this.logger,
    };

    if (process.env.NODE_ENV === 'CI') {
      const fileData = new FileDataSourceFactory({
        paths: [path.join(__dirname, '../../../../flagdata.json')],
      });
      options.updateProcessor = fileData.getFactory();
      this.logger.info('Using file data source for LaunchDarkly in CI environment');
    }

    const client: LDClient = init(config.get<string>('secrets.pcs.launchdarkly-sdk-key'), options);
    this.logger.info('LaunchDarkly client initialized');
    try {
      await client.waitForInitialization({ timeout: 10 });
      app.locals.launchDarklyClient = client;
    } catch (err) {
      this.logger.error('LaunchDarkly client initialization failed', err);
    }
  }
}
