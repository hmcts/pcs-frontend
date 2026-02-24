import config from 'config';
import { Express } from 'express';
import { TOTP } from 'totp-generator';

import { http } from '../../../../main/modules/http';
import { S2S } from '../../../../main/modules/s2s';

import { Logger } from '@modules/logger';

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
jest.mock('totp-generator');
jest.mock('ioredis');
jest.mock('jose', () => ({
  decodeJwt: jest.fn().mockReturnValue({ exp: 1234567890 }),
}));
jest.mock('../../../../main/modules/http', () => ({
  http: {
    setToken: jest.fn(),
    setTokenRegenerator: jest.fn(),
  },
}));

describe('S2S', () => {
  let s2s: S2S;
  let mockApp: Express;
  let mockRedisClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    duplicate: jest.Mock;
    publish: jest.Mock;
  };
  let mockSubscriber: {
    subscribe: jest.Mock;
    on: jest.Mock;
    quit: jest.Mock;
    unsubscribe: jest.Mock;
  };
  let mockLogger: Logger;

  beforeEach(() => {
    s2s = new S2S();
    mockSubscriber = {
      subscribe: jest.fn(),
      on: jest.fn(),
      quit: jest.fn(),
      unsubscribe: jest.fn(),
    };
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      duplicate: jest.fn().mockReturnValue(mockSubscriber),
      publish: jest.fn(),
    };
    mockApp = {
      locals: {
        redisClient: mockRedisClient,
      },
    } as unknown as Express;
    mockLogger = s2s.logger;

    // Mock config values
    (config.get as jest.Mock).mockImplementation((key: string) => {
      const configValues: Record<string, unknown> = {
        'secrets.pcs.pcs-frontend-s2s-secret': 'test-secret',
        s2s: {
          microservice: 'test-service',
          url: 'http://s2s-url',
          key: 'test-key',
          ttl: 3600,
        },
      };
      return configValues[key];
    });

    // Mock TOTP.generate
    (TOTP.generate as jest.Mock).mockReturnValue({ otp: '123456' });

    // Mock fetch globally
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('test-token'),
      })
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (s2s) {
      try {
        await s2s.cleanup();
      } catch {
        // Ignore cleanup errors in tests
      }
    }
    // Reset global fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('enableFor', () => {
    it('should set up Redis subscription for token updates', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.publish.mockResolvedValue(1);

      await s2s.enableFor(mockApp);

      expect(mockRedisClient.duplicate).toHaveBeenCalled();
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('s2s-token-update', expect.any(Function));
      expect(mockSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
    }, 5000);

    it('should get initial token and store it in Redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.publish.mockResolvedValue(1);

      const newToken = 'new-token';
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(newToken),
        })
      );

      await s2s.enableFor(mockApp);

      expect(global.fetch).toHaveBeenCalledWith('http://s2s-url/lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          microservice: 'test-service',
          oneTimePassword: '123456',
        }),
      });
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', newToken, 'EX', 3600);
      expect(http.setToken).toHaveBeenCalledWith(newToken, 1234567890);
    }, 5000);

    it('should use cached token from Redis if available', async () => {
      const cachedToken = 'cached-token';
      mockRedisClient.get.mockResolvedValue(cachedToken);
      mockRedisClient.set.mockResolvedValue('OK');

      await s2s.enableFor(mockApp);

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(http.setToken).toHaveBeenCalledWith(cachedToken, 1234567890);
    }, 5000);

    it('should handle S2S service error', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        })
      );

      await expect(s2s.enableFor(mockApp)).rejects.toThrow('Failed to initialize S2S token');
      expect(mockLogger.error).toHaveBeenCalled();
    }, 5000);

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(s2s.enableFor(mockApp)).rejects.toThrow('Failed to initialize S2S token');
      expect(mockLogger.error).toHaveBeenCalled();
    }, 5000);
  });

  describe('cleanup', () => {
    it('should unsubscribe and quit Redis subscriber', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.publish.mockResolvedValue(1);
      await s2s.enableFor(mockApp);
      await s2s.cleanup();

      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith('s2s-token-update');
      expect(mockSubscriber.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('S2S Redis subscriber cleaned up successfully');
    }, 5000);

    it('should handle cleanup errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.publish.mockResolvedValue(1);
      await s2s.enableFor(mockApp);
      mockSubscriber.unsubscribe.mockRejectedValue(new Error('Cleanup error'));
      await s2s.cleanup();

      expect(mockLogger.error).toHaveBeenCalledWith('Error cleaning up S2S Redis subscriber:', expect.any(Error));
    }, 5000);
  });

  describe('regenerateToken', () => {
    it('should regenerate token after removing from Redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.publish.mockResolvedValue(1);
      await s2s.enableFor(mockApp);
      const newToken = 'new-token';
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(newToken),
        })
      );

      await s2s.regenerateToken();

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      expect(global.fetch).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', newToken, 'EX', 3600);
    }, 5000);

    it('should throw error if S2S not initialized', async () => {
      await expect(s2s.regenerateToken()).rejects.toThrow('S2S not initialized');
    }, 5000);

    it('should throw error if token regeneration fails', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.publish.mockResolvedValue(1);
      await s2s.enableFor(mockApp);
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        })
      );

      await expect(s2s.regenerateToken()).rejects.toThrow('Failed to get new S2S token');
    }, 5000);
  });
});
