import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { Page, test } from '@playwright/test';

import { IAction, actionData, actionRecord } from '../../interfaces';

export const DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG = 'defendant-general-applications-r-2';

let ldClient: LaunchDarkly.LDClient | null = null;

export class LaunchDarklyAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const flagKey = fieldName as string;
    const flagOn = await this.getFlagValue(flagKey);
    if (action === 'skipTestIfLdFlagEnabled') {
      test.skip(flagOn, `Flag "${flagKey}" is ON`);
      return;
    }
    test.skip(!flagOn, `Flag "${flagKey}" is OFF / returned NULL`);
  }

  async getFlagValue(flagKey: string): Promise<boolean> {
    try {
      if (!ldClient) {
        const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
        if (!sdkKey) {
          console.error(`The SDK key is not set`);
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
