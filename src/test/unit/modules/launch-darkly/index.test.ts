import * as ld from '@launchdarkly/node-server-sdk';
import config from 'config';
import { Express } from 'express';

import { LaunchDarkly } from '@modules/launch-darkly';

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));
jest.mock('config');
jest.mock('@launchdarkly/node-server-sdk');

describe('LaunchDarkly', () => {
  let launchDarkly: LaunchDarkly;
  let mockApp: Express;
  let mockClient: { waitForInitialization: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    launchDarkly = new LaunchDarkly();
    mockApp = { locals: {} } as unknown as Express;
    mockClient = { waitForInitialization: jest.fn().mockResolvedValue(undefined) };
    (config.get as jest.Mock).mockReturnValue('sdk-key');
    (ld.init as jest.Mock).mockReturnValue(mockClient);
  });

  it('initialises the client with the configured sdk key', async () => {
    await launchDarkly.enableFor(mockApp);

    expect(config.get).toHaveBeenCalledWith('secrets.pcs.launchdarkly-sdk-key');
    expect(ld.init).toHaveBeenCalledWith('sdk-key', expect.objectContaining({ logger: expect.anything() }));
  });

  it('registers the client on the app when initialisation succeeds', async () => {
    await launchDarkly.enableFor(mockApp);

    expect(mockClient.waitForInitialization).toHaveBeenCalledWith({ timeout: 10 });
    expect(mockApp.locals.launchDarklyClient).toBe(mockClient);
  });

  it('still registers the client when initialisation times out, so flags recover once the SDK reconnects', async () => {
    mockClient.waitForInitialization.mockRejectedValue(new Error('waitForInitialization timed out after 10 seconds.'));

    await expect(launchDarkly.enableFor(mockApp)).resolves.toBeUndefined();

    expect(mockApp.locals.launchDarklyClient).toBe(mockClient);
  });
});
