import * as LDClient from '@launchdarkly/node-server-sdk';
import type { Request } from 'express';

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

    result = await ldClient?.variation(flagName, context, defaultValue);
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('LaunchDarkly evaluation failed', err);
  }

  return result;
};
