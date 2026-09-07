import * as ld from '@launchdarkly/node-server-sdk';
import config from 'config';
import type * as express from 'express';

import { Logger } from '@modules/logger';

export class LaunchDarkly {
  private readonly logger = Logger.getLogger('launch-darkly');

  public async enableFor(app: express.Express): Promise<void> {
    const client: ld.LDClient = ld.init(config.get<string>('secrets.pcs.launchdarkly-sdk-key'), {
      logger: this.logger,
    });

    // Register before waiting: the SDK retries in the background, so a slow init self-heals.
    app.locals.launchDarklyClient = client;

    try {
      await client.waitForInitialization({ timeout: 10 });
      this.logger.info('LaunchDarkly client initialized successfully');
    } catch (err) {
      this.logger.error('LaunchDarkly client initialization failed', err);
    }
  }
}
