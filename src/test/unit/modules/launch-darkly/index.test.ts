// Mock logger to capture logging without real output
jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(),
  },
}));

// Mock config so we can control the SDK key returned
jest.mock('config');

// Prepare a mock for LaunchDarkly SDK before the module under test is imported
const mockLdClient = {
  waitForInitialization: jest.fn(),
};

jest.mock('@launchdarkly/node-server-sdk', () => ({
  init: jest.fn(() => mockLdClient),
}));

import * as ld from '@launchdarkly/node-server-sdk';
import config from 'config';
import { Express } from 'express';

import { LaunchDarkly } from '../../../../main/modules/launch-darkly';

import { Logger } from '@modules/logger';

describe('LaunchDarkly', () => {
  let launchDarkly: LaunchDarkly;
  let mockApp: Express;
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure Logger.getLogger returns our mock logger for every test
    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);

    // Mock config.get to return the expected SDK key
    (config.get as jest.Mock).mockImplementation((key: string) => {
      const configValues: Record<string, unknown> = {
        'secrets.pcs.launchdarkly-sdk-key': 'test-sdk-key',
      };
      return configValues[key];
    });

    // Reset mock client implementation between tests
    mockLdClient.waitForInitialization.mockReset();

    launchDarkly = new LaunchDarkly();
    mockApp = { locals: {} } as unknown as Express;
  });

  describe('enableFor', () => {
    it('should initialise LaunchDarkly client and attach it to app.locals', async () => {
      // Arrange
      mockLdClient.waitForInitialization.mockResolvedValue(undefined);

      // Act
      await launchDarkly.enableFor(mockApp);

      // Assert
      expect(ld.init).toHaveBeenCalledWith('test-sdk-key', expect.objectContaining({ logger: mockLogger }));
      expect(mockLdClient.waitForInitialization).toHaveBeenCalledWith({ timeout: 10 });
      expect(mockApp.locals.launchDarklyClient).toBe(mockLdClient);
    }, 5000);

    it('should log an error and not attach client when initialisation fails', async () => {
      // Arrange
      const initError = new Error('initialisation failed');
      mockLdClient.waitForInitialization.mockRejectedValue(initError);

      // Act
      await launchDarkly.enableFor(mockApp);

      // Assert
      expect(mockLdClient.waitForInitialization).toHaveBeenCalled();
      expect(mockApp.locals.launchDarklyClient).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith('LaunchDarkly client initialization failed', initError);
    }, 5000);
  });
});
