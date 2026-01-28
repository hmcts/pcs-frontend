import { Logger } from '@hmcts/nodejs-logging';
import * as LDClient from '@launchdarkly/node-server-sdk';
import type { Request } from 'express';

const logger = Logger.getLogger('getLaunchDarklyFlag');

export const getLaunchDarklyFlag = async <T>(req: Request, flagName: string, defaultValue: T): Promise<T> => {
  const ldClient = (req.app?.locals?.launchDarklyClient as LDClient.LDClient | undefined) ?? undefined;

  let result: T = defaultValue;
  try {
    const context: LDClient.LDContext = {
      kind: 'user',
      key: (req.session?.user?.uid as string) ?? 'anonymous',
      name: req.session?.user?.name ?? 'anonymous',
      email: req.session?.user?.email ?? 'anonymous',
      firstName: req.session?.user?.given_name ?? 'anonymous',
      lastName: req.session?.user?.family_name ?? 'anonymous',
      custom: {
        roles: req.session?.user?.roles ?? [],
      },
    };

    // If the flag does not exist LD will return the default (empty string) so we route to capture.
    // If LaunchDarkly client is not initialized or variation returns null/undefined, default to empty string.
    result = (await ldClient?.variation('defendant-name', context, '')) ?? '';
    logger.info('-------Defendant name from LaunchDarkly----------', { result, flagName });

  } catch (err: unknown) {
    logger.error('LaunchDarkly evaluation failed', err);
  }

  return result;
};
