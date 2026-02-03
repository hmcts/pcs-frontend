// Mock logger to capture logging without real output
jest.mock('@hmcts/nodejs-logging', () => ({
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

// Mock FileDataSourceFactory for CI environment tests
const mockGetFactory = jest.fn();
const mockFileDataSourceFactory = jest.fn().mockImplementation(() => ({
  getFactory: mockGetFactory,
}));

jest.mock('@launchdarkly/node-server-sdk/integrations', () => ({
  FileDataSourceFactory: mockFileDataSourceFactory,
}));

import { Logger } from '@hmcts/nodejs-logging';
import * as ld from '@launchdarkly/node-server-sdk';
import config from 'config';
import { Express } from 'express';

import { LaunchDarkly } from '../../../../main/modules/launch-darkly';

describe('LaunchDarkly', () => {
  let launchDarkly: LaunchDarkly;
  let mockApp: Express;
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variable
    delete process.env.NODE_ENV;

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
    mockGetFactory.mockReset();
    mockFileDataSourceFactory.mockClear();

    launchDarkly = new LaunchDarkly();
    mockApp = { locals: {} } as unknown as Express;
  });

  afterEach(() => {
    // Restore original environment variable
    process.env.NODE_ENV = originalEnv;
  });

  describe('enableFor', () => {
    describe('non-CI environment', () => {
      it('should initialise LaunchDarkly client and attach it to app.locals', async () => {
        // Arrange
        process.env.NODE_ENV = 'development';
        mockLdClient.waitForInitialization.mockResolvedValue(undefined);

        // Act
        await launchDarkly.enableFor(mockApp);

        // Assert
        expect(ld.init).toHaveBeenCalledWith('test-sdk-key', expect.objectContaining({ logger: mockLogger }));
        expect(ld.init).toHaveBeenCalledWith(
          'test-sdk-key',
          expect.not.objectContaining({ updateProcessor: expect.anything() })
        );
        expect(mockLdClient.waitForInitialization).toHaveBeenCalledWith({ timeout: 10 });
        expect(mockApp.locals.launchDarklyClient).toBe(mockLdClient);
        expect(mockLogger.info).toHaveBeenCalledWith('LaunchDarkly client initialized');
        expect(mockLogger.info).not.toHaveBeenCalledWith('Using file data source for LaunchDarkly in CI environment');
      }, 5000);

      it('should log an error and not attach client when initialisation fails', async () => {
        // Arrange
        process.env.NODE_ENV = 'development';
        const initError = new Error('initialisation failed');
        mockLdClient.waitForInitialization.mockRejectedValue(initError);

        // Act
        await launchDarkly.enableFor(mockApp);

        // Assert
        expect(mockLdClient.waitForInitialization).toHaveBeenCalled();
        expect(mockApp.locals.launchDarklyClient).toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledWith('LaunchDarkly client initialization failed', initError);
        expect(mockLogger.info).toHaveBeenCalledWith('LaunchDarkly client initialized');
      }, 5000);
    });

    describe('CI environment', () => {
      it('should use FileDataSourceFactory when NODE_ENV is CI', async () => {
        // Arrange
        process.env.NODE_ENV = 'CI';
        const mockFactory = jest.fn();
        mockGetFactory.mockReturnValue(mockFactory);
        mockLdClient.waitForInitialization.mockResolvedValue(undefined);

        // Act
        await launchDarkly.enableFor(mockApp);

        // Assert
        expect(mockFileDataSourceFactory).toHaveBeenCalledWith({
          paths: expect.arrayContaining([expect.stringContaining('flagdata.json')]),
        });
        expect(mockGetFactory).toHaveBeenCalled();
        expect(ld.init).toHaveBeenCalledWith(
          'test-sdk-key',
          expect.objectContaining({
            logger: mockLogger,
            updateProcessor: mockFactory,
          })
        );
        expect(mockLdClient.waitForInitialization).toHaveBeenCalledWith({ timeout: 10 });
        expect(mockApp.locals.launchDarklyClient).toBe(mockLdClient);
        expect(mockLogger.info).toHaveBeenCalledWith('Using file data source for LaunchDarkly in CI environment');
        expect(mockLogger.info).toHaveBeenCalledWith('LaunchDarkly client initialized');
      }, 5000);

      it('should log an error and not attach client when initialisation fails in CI', async () => {
        // Arrange
        process.env.NODE_ENV = 'CI';
        const mockFactory = jest.fn();
        mockGetFactory.mockReturnValue(mockFactory);
        const initError = new Error('initialisation failed');
        mockLdClient.waitForInitialization.mockRejectedValue(initError);

        // Act
        await launchDarkly.enableFor(mockApp);

        // Assert
        expect(mockFileDataSourceFactory).toHaveBeenCalled();
        expect(mockLdClient.waitForInitialization).toHaveBeenCalled();
        expect(mockApp.locals.launchDarklyClient).toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledWith('LaunchDarkly client initialization failed', initError);
        expect(mockLogger.info).toHaveBeenCalledWith('Using file data source for LaunchDarkly in CI environment');
        expect(mockLogger.info).toHaveBeenCalledWith('LaunchDarkly client initialized');
      }, 5000);
    });
  });
});
