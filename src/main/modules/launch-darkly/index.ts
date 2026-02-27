import { Logger } from '@hmcts/nodejs-logging';
import * as ld from '@launchdarkly/node-server-sdk';
import config from 'config';
import type * as express from 'express';

export class LaunchDarkly {
  private readonly logger = Logger.getLogger('launch-darkly');

  public async enableFor(app: express.Express): Promise<void> {
    const client: ld.LDClient = ld.init(config.get<string>('secrets.pcs.launchdarkly-sdk-key'), {
      logger: this.logger,
    });

    try {
      await client.waitForInitialization({ timeout: 10 });
      app.locals.launchDarklyClient = client;
      this.logger.info('LaunchDarkly client initialized successfully');
    } catch (err) {
      this.logger.error('LaunchDarkly client initialization failed', err);
    }
  }
}
