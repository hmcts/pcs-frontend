import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { Page, test } from '@playwright/test';

import { IAction, actionData, actionRecord } from '../../interfaces';

export const DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG = 'defendant-general-applications-r-2';

let ldClient: LaunchDarkly.LDClient | null = null;

/**
 * Mirrors the app's LAUNCHDARKLY_ENV: `<env>` for pcs.<env>.platform.hmcts.net,
 * the full preview hostname for PR previews, otherwise the hostname.
 */
export function resolveLdEnvironment(): string | undefined {
  if (process.env.LAUNCHDARKLY_ENV) {
    return process.env.LAUNCHDARKLY_ENV;
  }
  const testUrl = process.env.TEST_URL;
  if (!testUrl) {
    return undefined;
  }
  try {
    const hostname = new URL(testUrl).hostname;
    const envMatch = /^pcs\.([^.]+)\.platform\.hmcts\.net$/.exec(hostname);
    return envMatch ? envMatch[1] : hostname;
  } catch {
    return undefined;
  }
}

export class LaunchDarklyAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const flagKey = fieldName as string;
    const flagValue = await this.getFlagValue(flagKey);
    if (action === 'skipTestIfLdFlagEnabled') {
      if (flagValue === undefined) {
        throw new Error(
          `Cannot evaluate LaunchDarkly flag "${flagKey}" (SDK key missing, initialisation failed or evaluation errored), so it is unknown which copy of the test to run`
        );
      }
      test.skip(flagValue, `Flag "${flagKey}" is ON`);
      return;
    }
    test.skip(flagValue !== true, `Flag "${flagKey}" is OFF / could not be evaluated`);
  }

  /** Returns undefined when the real value cannot be determined. */
  async getFlagValue(flagKey: string): Promise<boolean | undefined> {
    try {
      if (!ldClient) {
        const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
        if (!sdkKey) {
          console.error(`The SDK key is not set`);
          return undefined;
        }

        const client = LaunchDarkly.init(sdkKey);
        try {
          await client.waitForInitialization({ timeout: 10000 });
        } catch (error) {
          client.close();
          throw error;
        }
        ldClient = client;
      }

      const context: LaunchDarkly.LDContext = { kind: 'user', key: 'default', environment: resolveLdEnvironment() };
      const detail = await ldClient.variationDetail(flagKey, context, false);
      if (detail.reason?.kind === 'ERROR') {
        console.error(`LaunchDarkly evaluation error for flag "${flagKey}": ${detail.reason.errorKind}`);
        return undefined;
      }
      return detail.value as boolean;
    } catch (error) {
      console.error(`LaunchDarkly error for flag "${flagKey}":`, error);
      return undefined;
    }
  }
}
