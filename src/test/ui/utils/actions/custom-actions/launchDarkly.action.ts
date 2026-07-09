import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { Page, test } from '@playwright/test';

import { IAction, actionData, actionRecord } from '../../interfaces';

let ldClient: LaunchDarkly.LDClient | null = null;

export class LaunchDarklyAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const flagKey = fieldName as string;
    const flagOn = await this.getFlagValue(flagKey);
    test.skip(!flagOn, `Flag "${flagKey}" is OFF`);
  }

  private async getFlagValue(flagKey: string): Promise<boolean> {
    try {
      if (!ldClient) {
        const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
        if (!sdkKey) {
          return false;
        }

        ldClient = LaunchDarkly.init(sdkKey);
        await ldClient.waitForInitialization({ timeout: 10000 });
      }

      return (await ldClient.variation(flagKey, { key: 'default' }, false)) as boolean;
    } catch (error) {
      console.error(`LaunchDarkly error for flag "${flagKey}":`, error);
      return false;
    }
  }
}
