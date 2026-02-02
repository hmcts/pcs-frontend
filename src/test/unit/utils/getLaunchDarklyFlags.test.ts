// Mock logger to capture logging without real output
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

import * as LDClient from '@launchdarkly/node-server-sdk';
import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';

describe('getLaunchDarklyFlag', () => {
  let mockRequest: Partial<Request>;
  let mockLdClient: Partial<LDClient.LDClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock LaunchDarkly client
    mockLdClient = {
      variation: jest.fn(),
    };

    // Create a mock request with default structure
    mockRequest = {
      app: {
        locals: {
          launchDarklyClient: mockLdClient,
        },
      } as unknown as Request['app'],
      session: {
        user: {
          uid: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          roles: ['citizen'],
        },
      } as unknown as Request['session'],
    };
  });

  describe('when LaunchDarkly client exists', () => {
    it('should return the flag value from LaunchDarkly when variation returns a value', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      const flagValue = 'flag-value';
      (mockLdClient.variation as jest.Mock).mockResolvedValue(flagValue);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(flagValue);
      expect(mockLdClient.variation).toHaveBeenCalledWith(
        flagName,
        expect.objectContaining({
          kind: 'user',
          key: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          custom: {
            roles: ['citizen'],
          },
        }),
        defaultValue
      );
      expect(mockLogger.info).toHaveBeenCalledWith('-------Flag from LaunchDarkly----------', {
        result: flagValue,
        flagName,
      });
    });

    it('should return the default value when variation returns null', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      (mockLdClient.variation as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
      expect(mockLdClient.variation).toHaveBeenCalled();
    });

    it('should return the default value when variation returns undefined', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      (mockLdClient.variation as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
      expect(mockLdClient.variation).toHaveBeenCalled();
    });

    it('should work with boolean default values', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = false;
      const flagValue = true;
      (mockLdClient.variation as jest.Mock).mockResolvedValue(flagValue);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(flagValue);
      expect(mockLdClient.variation).toHaveBeenCalledWith(flagName, expect.any(Object), defaultValue);
    });

    it('should work with number default values', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 0;
      const flagValue = 42;
      (mockLdClient.variation as jest.Mock).mockResolvedValue(flagValue);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(flagValue);
    });

    it('should work with object default values', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = { key: 'value' };
      const flagValue = { key: 'new-value' };
      (mockLdClient.variation as jest.Mock).mockResolvedValue(flagValue);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toEqual(flagValue);
    });
  });

  describe('when LaunchDarkly client does not exist', () => {
    it('should return the default value when launchDarklyClient is undefined', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      if (mockRequest.app) {
        mockRequest.app.locals.launchDarklyClient = undefined;
      }

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
      expect(mockLogger.info).toHaveBeenCalledWith('-------Flag from LaunchDarkly----------', {
        result: defaultValue,
        flagName,
      });
    });

    it('should return the default value when app.locals is undefined', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      mockRequest.app = undefined as unknown as Request['app'];

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
    });

    it('should return the default value when app is undefined', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      mockRequest.app = undefined as unknown as Request['app'];

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
    });
  });

  describe('context creation', () => {
    it('should create context with anonymous values when user session is missing', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      mockRequest.session = undefined as unknown as Request['session'];
      (mockLdClient.variation as jest.Mock).mockResolvedValue(defaultValue);

      // Act
      await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(mockLdClient.variation).toHaveBeenCalledWith(
        flagName,
        expect.objectContaining({
          kind: 'user',
          key: 'anonymous',
          name: 'anonymous',
          email: 'anonymous',
          firstName: 'anonymous',
          lastName: 'anonymous',
          custom: {
            roles: [],
          },
        }),
        defaultValue
      );
    });

    it('should create context with anonymous values when user is missing', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      mockRequest.session = {} as unknown as Request['session'];
      (mockLdClient.variation as jest.Mock).mockResolvedValue(defaultValue);

      // Act
      await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(mockLdClient.variation).toHaveBeenCalledWith(
        flagName,
        expect.objectContaining({
          key: 'anonymous',
          name: 'anonymous',
          email: 'anonymous',
          firstName: 'anonymous',
          lastName: 'anonymous',
          custom: {
            roles: [],
          },
        }),
        defaultValue
      );
    });

    it('should create context with partial user data', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      mockRequest.session = {
        user: {
          uid: 'partial-user-id',
          email: 'partial@example.com',
        },
      } as unknown as Request['session'];
      (mockLdClient.variation as jest.Mock).mockResolvedValue(defaultValue);

      // Act
      await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(mockLdClient.variation).toHaveBeenCalledWith(
        flagName,
        expect.objectContaining({
          key: 'partial-user-id',
          name: 'anonymous',
          email: 'partial@example.com',
          firstName: 'anonymous',
          lastName: 'anonymous',
          custom: {
            roles: [],
          },
        }),
        defaultValue
      );
    });

    it('should create context with empty roles array when roles are missing', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      mockRequest.session = {
        user: {
          uid: 'test-user-id',
        },
      } as unknown as Request['session'];
      (mockLdClient.variation as jest.Mock).mockResolvedValue(defaultValue);

      // Act
      await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(mockLdClient.variation).toHaveBeenCalledWith(
        flagName,
        expect.objectContaining({
          custom: {
            roles: [],
          },
        }),
        defaultValue
      );
    });
  });

  describe('error handling', () => {
    it('should return the default value and log error when variation throws an error', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      const error = new Error('LaunchDarkly error');
      (mockLdClient.variation as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
      expect(mockLogger.error).toHaveBeenCalledWith('LaunchDarkly evaluation failed', error);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return the default value when variation throws a non-Error object', async () => {
      // Arrange
      const flagName = 'test-flag';
      const defaultValue = 'default-value';
      const error = 'String error';
      (mockLdClient.variation as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await getLaunchDarklyFlag(mockRequest as unknown as Request, flagName, defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
      expect(mockLogger.error).toHaveBeenCalledWith('LaunchDarkly evaluation failed', error);
    });
  });
});
