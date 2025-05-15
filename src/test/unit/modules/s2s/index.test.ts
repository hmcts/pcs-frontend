import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import { TOTP } from 'totp-generator';

import { S2S } from '../../../../main/modules/s2s';

jest.mock('@hmcts/nodejs-logging', () => ({
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
jest.mock('axios');

describe('S2S', () => {
  let s2s: S2S;
  let mockApp: Express;
  let mockRedisClient: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockLogger: Logger;

  beforeEach(() => {
    s2s = new S2S();
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
    };
    mockApp = {
      locals: {
        redisClient: mockRedisClient,
      },
      use: jest.fn(),
    } as unknown as Express;
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
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

    // Mock axios defaults
    axios.defaults.headers.common = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enableFor', () => {
    it('should set up middleware on the app', () => {
      s2s.enableFor(mockApp);
      expect(mockApp.use).toHaveBeenCalled();
    });

    it('should use cached token from Redis if available', async () => {
      const cachedToken = 'cached-token';
      mockRedisClient.get.mockResolvedValue(cachedToken);

      s2s.enableFor(mockApp);
      const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(axios.defaults.headers.common['ServiceAuthorization']).toBe(`Bearer ${cachedToken}`);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fetch new token when Redis cache is empty', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const newToken = 'new-token';
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: () => Promise.resolve(newToken),
      });

      s2s.enableFor(mockApp);
      const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];
      await middleware(mockRequest, mockResponse, mockNext);

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
      expect(axios.defaults.headers.common['ServiceAuthorization']).toBe(`Bearer ${newToken}`);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle S2S service error', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue({
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      s2s.enableFor(mockApp);
      const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(axios.defaults.headers.common['ServiceAuthorization']).toBeUndefined();
    }, 10000); // Increased timeout to 10 seconds

    it('should not update header if token is already set correctly', async () => {
      const existingToken = 'existing-token';
      mockRedisClient.get.mockResolvedValue(existingToken);
      axios.defaults.headers.common['ServiceAuthorization'] = `Bearer ${existingToken}`;

      s2s.enableFor(mockApp);
      const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];
      await middleware(mockRequest, mockResponse, mockNext);

      expect(axios.defaults.headers.common['ServiceAuthorization']).toBe(`Bearer ${existingToken}`);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      s2s.enableFor(mockApp);
      const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error in S2S middleware:', expect.any(Error));
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
