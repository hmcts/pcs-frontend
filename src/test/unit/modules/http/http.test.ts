/**
 * This file is loaded before the module can be imported
 * to ensure the mock is in place before initialization
 */

const mockAxiosCreate = jest.fn();
const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  head: jest.fn(),
  options: jest.fn(),
  request: jest.fn(),
  getUri: jest.fn(),
  postForm: jest.fn(),
  putForm: jest.fn(),
  patchForm: jest.fn(),
};

// Mock axios before any imports
jest.mock('axios', () => {
  mockAxiosCreate.mockReturnValue(mockAxiosInstance);
  return {
    create: mockAxiosCreate,
    default: { create: mockAxiosCreate },
  };
});

// Mock logger to avoid errors
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      errorWithReq: jest.fn(),
    }),
  },
}));

// Mock Date.now() for consistent testing of token expiry
const mockDateNow = jest.spyOn(Date, 'now');

// Import AFTER mocks are established - import the factory function, not the singleton
import { HTTPError } from '../../../../main/HttpError';
import { HttpService, createHttp } from '../../../../main/modules/http';

describe('HttpService', () => {
  const successResponse = { data: { success: true } };
  let testHttp: HttpService;

  // Helper to get request interceptor for testing
  const getRequestInterceptor = (): ((config: Record<string, unknown>) => Promise<InterceptedConfig>) => {
    return mockAxiosInstance.interceptors.request.use.mock.calls[0][0] as unknown as (
      config: Record<string, unknown>
    ) => Promise<InterceptedConfig>;
  };

  // Helper to get response error handler for testing
  const getResponseErrorHandler = (): ((error: Record<string, unknown>) => Promise<unknown>) => {
    return mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
  };

  // Define type for intercepted config
  type InterceptedConfig = {
    headers: {
      ServiceAuthorization?: string;
      [key: string]: string | undefined;
    };
    [key: string]: unknown;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset date mock
    mockDateNow.mockReset();
    // Default date mock value
    mockDateNow.mockImplementation(() => 1609459200000); // 2021-01-01T00:00:00.000Z

    // Reset all mock implementations
    Object.values(mockAxiosInstance).forEach(method => {
      if (typeof method === 'function') {
        (method as jest.Mock).mockReset();
      }
    });

    // Create a fresh instance for each test
    testHttp = createHttp();

    // Setup default responses
    mockAxiosInstance.get.mockResolvedValue(successResponse);
    mockAxiosInstance.post.mockResolvedValue(successResponse);
    mockAxiosInstance.put.mockResolvedValue(successResponse);
    mockAxiosInstance.delete.mockResolvedValue(successResponse);
    mockAxiosInstance.patch.mockResolvedValue(successResponse);
    mockAxiosInstance.head.mockResolvedValue(successResponse);
    mockAxiosInstance.options.mockResolvedValue(successResponse);
    mockAxiosInstance.request.mockResolvedValue(successResponse);
    mockAxiosInstance.getUri.mockReturnValue('https://example.com/test');
    mockAxiosInstance.postForm.mockResolvedValue(successResponse);
    mockAxiosInstance.putForm.mockResolvedValue(successResponse);
    mockAxiosInstance.patchForm.mockResolvedValue(successResponse);
  });

  describe('token management', () => {
    it('should set token and expiry', async () => {
      const token = 'test-token';
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      testHttp.setToken(token, expiry);

      // Manually check if the request interceptor adds the token
      const requestInterceptor = getRequestInterceptor();

      // Create a sample config to pass through the interceptor
      const testConfig = { headers: {} };

      // Run it through the interceptor
      const resultConfig = await requestInterceptor(testConfig);

      // Verify the token was added to the header
      expect(resultConfig.headers.ServiceAuthorization).toBe(`Bearer ${token}`);
    });

    it('should detect when token is expired', async () => {
      // Current time is 2021-01-01T00:00:00.000Z (set in beforeEach)

      // Set token to expire 10 seconds ago
      const expiredToken = 'expired-token';
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 10;
      testHttp.setToken(expiredToken, expiredTimestamp);

      // Setup a regenerator to verify it gets called
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        testHttp.setToken('new-token', Math.floor(Date.now() / 1000) + 3600);
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Get the request interceptor - this is what checks expiry
      const requestInterceptor = getRequestInterceptor();

      // Run the interceptor - with expired token this should trigger regeneration
      await requestInterceptor({ headers: {} });

      // Verify regenerator was called due to expired token
      expect(mockRegenerator).toHaveBeenCalled();
    });

    it('should detect when token is about to expire (within 30 second buffer)', async () => {
      // Set token to expire in 20 seconds (under 30s buffer)
      const almostExpiredToken = 'almost-expired-token';
      const almostExpiredTimestamp = Math.floor(Date.now() / 1000) + 20; // 20s from now
      testHttp.setToken(almostExpiredToken, almostExpiredTimestamp);

      // Setup a regenerator to verify it gets called
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        testHttp.setToken('new-token', Math.floor(Date.now() / 1000) + 3600);
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Get the request interceptor - this is what checks expiry
      const requestInterceptor = getRequestInterceptor();

      // Run the interceptor - with almost expired token this should trigger regeneration
      await requestInterceptor({ headers: {} });

      // Verify regenerator was called due to token expiring soon
      expect(mockRegenerator).toHaveBeenCalled();
    });

    it('should not regenerate token when it is valid and not expiring soon', async () => {
      // Set token to expire in 60 seconds (outside 30s buffer)
      const validToken = 'valid-token';
      const validTimestamp = Math.floor(Date.now() / 1000) + 60; // 60s from now
      testHttp.setToken(validToken, validTimestamp);

      // Setup a regenerator to verify it doesn't get called
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        testHttp.setToken('new-token', Math.floor(Date.now() / 1000) + 3600);
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Try to make a request
      await testHttp.get('/test');

      // Verify regenerator was NOT called for valid token
      expect(mockRegenerator).not.toHaveBeenCalled();

      // Check that the original token was used
      const requestInterceptor = getRequestInterceptor();
      const testConfig = { headers: {} };
      const resultConfig = await requestInterceptor(testConfig);
      expect(resultConfig.headers.ServiceAuthorization).toBe(`Bearer ${validToken}`);
    });

    it('should handle 401 response with token regeneration', async () => {
      // Mock the request that will be retried
      const requestConfig = {
        url: '/test',
        headers: {},
        __isRetryRequest: false,
      };

      // Set up token and regenerator
      testHttp.setToken('initial-token', Math.floor(Date.now() / 1000) + 3600);
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        testHttp.setToken('new-token', Math.floor(Date.now() / 1000) + 7200);
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Create the 401 error
      const error = {
        config: requestConfig,
        response: { status: 401 },
      };

      // Mock axios request to succeed on retry
      mockAxiosInstance.request.mockResolvedValueOnce({ data: 'success after retry' });

      // Access the response error handler
      const errorHandler = getResponseErrorHandler();

      // Call the error handler directly
      const result = await errorHandler(error);

      // Verify token was regenerated
      expect(mockRegenerator).toHaveBeenCalled();

      // Verify request was retried
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          __isRetryRequest: true,
          url: '/test',
        })
      );

      // Verify successful result
      expect(result).toEqual({ data: 'success after retry' });
    });

    it('should handle retry failure during 401 handling', async () => {
      // Mock the request that will be retried
      const requestConfig = {
        url: '/test',
        headers: {},
        __isRetryRequest: false,
      };

      // Set up token and regenerator
      testHttp.setToken('initial-token', Math.floor(Date.now() / 1000) + 3600);
      const retryError = new Error('Retry failed');
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        throw retryError;
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Create the 401 error
      const error = {
        config: requestConfig,
        response: { status: 401 },
      };

      // Access the response error handler
      const errorHandler = getResponseErrorHandler();

      // Call the error handler and expect it to reject with the retry error
      await expect(errorHandler(error)).rejects.toBe(retryError);

      // Verify regenerator was called
      expect(mockRegenerator).toHaveBeenCalled();

      // Verify request was NOT retried since regeneration failed
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });

    it('should reject with HTTPError(401) for user-token requests without S2S retry', async () => {
      const requestConfig = {
        url: '/test',
        headers: { Authorization: 'Bearer user-oidc-token' },
        __isRetryRequest: false,
      };

      const error = {
        config: requestConfig,
        response: { status: 401 },
      };

      const errorHandler = getResponseErrorHandler();

      const rejectedError = await errorHandler(error).catch(e => e);

      expect(rejectedError).toBeInstanceOf(HTTPError);
      expect((rejectedError as HTTPError).status).toBe(401);

      // S2S regenerator should NOT be called, request should NOT be retried
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });

    it('should pass through non-401 errors without retry', async () => {
      // Create a non-401 error (e.g., 500)
      const error = {
        config: { url: '/test' },
        response: { status: 500 },
      };

      // Access the response error handler
      const errorHandler = getResponseErrorHandler();

      // Call the error handler and expect it to reject with the original error
      await expect(errorHandler(error)).rejects.toBe(error);

      // Should not have called the request method (no retry)
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });

    it('should throw error when no token and no regenerator', async () => {
      // Set both token and regenerator to null/empty
      testHttp.setToken('', 0);
      testHttp.setTokenRegenerator(null);

      // Make the interceptor fail by simulating a request interceptor
      const requestInterceptor = getRequestInterceptor();

      // Mock the request interceptor to verify it throws when no token/regenerator
      await expect(requestInterceptor({ headers: {} })).rejects.toThrow(
        'No valid S2S token available and no regenerator configured'
      );
    });

    it('should throw error when regenerator is set but fails to regenerate token', async () => {
      // Set expired token
      testHttp.setToken('', 0);

      // Set regenerator that fails
      const regenerationError = new Error('Failed to generate token');
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        throw regenerationError;
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Call request interceptor
      const requestInterceptor = getRequestInterceptor();

      // Expect it to reject with regeneration error
      await expect(requestInterceptor({ headers: {} })).rejects.toThrow(regenerationError);

      // Verify regenerator was called
      expect(mockRegenerator).toHaveBeenCalled();
    });

    it('should throw error when regenerator fails to set token within timeout', async () => {
      // Mock Date.now to advance time during regeneration wait loop
      let callCount = 0;
      mockDateNow.mockImplementation(() => {
        callCount++;
        // Start at base time, then advance beyond timeout on subsequent calls
        return callCount === 1 ? 1609459200000 : 1609459200000 + 6000; // Exceed 5000ms timeout
      });

      // Set expired token
      testHttp.setToken('', 0);

      // Set regenerator that doesn't set token (fails by timeout)
      const mockRegenerator = jest.fn().mockImplementation(async () => {
        // Don't set token - will cause timeout
      });
      testHttp.setTokenRegenerator(mockRegenerator);

      // Call request interceptor
      const requestInterceptor = getRequestInterceptor();

      // Expect it to reject with timeout error
      await expect(requestInterceptor({ headers: {} })).rejects.toThrow(
        'Failed to regenerate S2S token - token not set within timeout'
      );

      // Verify regenerator was called
      expect(mockRegenerator).toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      // Clear previous test mocks
      mockAxiosInstance.get.mockReset();
      mockAxiosInstance.post.mockReset();
      mockAxiosInstance.put.mockReset();
      mockAxiosInstance.delete.mockReset();
      mockAxiosInstance.patch.mockReset();
      mockAxiosInstance.head.mockReset();
      mockAxiosInstance.options.mockReset();
      mockAxiosInstance.request.mockReset();
      mockAxiosInstance.getUri.mockReset();
      mockAxiosInstance.postForm.mockReset();
      mockAxiosInstance.putForm.mockReset();
      mockAxiosInstance.patchForm.mockReset();

      // Set valid token for HTTP tests to avoid interceptor issues
      testHttp.setToken('test-token', Math.floor(Date.now() / 1000) + 3600);
    });

    it('should call get with correct parameters', async () => {
      const expectedResponse = { data: 'test' };
      mockAxiosInstance.get.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.get('/test', { params: { id: 1 } });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          params: { id: 1 },
        })
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should call post with correct parameters', async () => {
      const expectedResponse = { data: 'created' };
      mockAxiosInstance.post.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.post(
        '/test',
        { name: 'test' },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test',
        { name: 'test' },
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should call put with correct parameters', async () => {
      const expectedResponse = { data: 'updated' };
      mockAxiosInstance.put.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.put('/test/1', { name: 'updated' });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', { name: 'updated' }, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call delete with correct parameters', async () => {
      const expectedResponse = { data: 'deleted' };
      mockAxiosInstance.delete.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.delete('/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call patch with correct parameters', async () => {
      const expectedResponse = { data: 'patched' };
      mockAxiosInstance.patch.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.patch('/test/1', { name: 'patched' });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', { name: 'patched' }, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call head with correct parameters', async () => {
      const expectedResponse = { headers: { 'content-type': 'application/json' } };
      mockAxiosInstance.head.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.head('/test/1');

      expect(mockAxiosInstance.head).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call options with correct parameters', async () => {
      const expectedResponse = { headers: { allow: 'GET, POST, PUT' } };
      mockAxiosInstance.options.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.options('/test/1');

      expect(mockAxiosInstance.options).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call request with correct parameters', async () => {
      const expectedResponse = { data: 'requested' };
      mockAxiosInstance.request.mockResolvedValueOnce(expectedResponse);

      const result = await testHttp.request({
        url: '/test',
        method: 'GET',
        params: { id: 1 },
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: '/test',
        method: 'GET',
        params: { id: 1 },
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should call getUri with correct parameters', async () => {
      const expectedUri = 'https://example.com/test?id=1';
      mockAxiosInstance.getUri.mockReturnValueOnce(expectedUri);

      const result = testHttp.getUri({
        url: '/test',
        params: { id: 1 },
      });

      expect(mockAxiosInstance.getUri).toHaveBeenCalledWith({
        url: '/test',
        params: { id: 1 },
      });
      expect(result).toEqual(expectedUri);
    });

    it('should call postForm with correct parameters', async () => {
      const expectedResponse = { data: 'posted form' };
      mockAxiosInstance.postForm.mockResolvedValueOnce(expectedResponse);

      const formData = { name: 'test', file: 'test-file' };
      const result = await testHttp.postForm('/upload', formData);

      expect(mockAxiosInstance.postForm).toHaveBeenCalledWith('/upload', formData, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call putForm with correct parameters', async () => {
      const expectedResponse = { data: 'put form' };
      mockAxiosInstance.putForm.mockResolvedValueOnce(expectedResponse);

      const formData = { name: 'updated', file: 'updated-file' };
      const result = await testHttp.putForm('/upload/1', formData);

      expect(mockAxiosInstance.putForm).toHaveBeenCalledWith('/upload/1', formData, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should call patchForm with correct parameters', async () => {
      const expectedResponse = { data: 'patched form' };
      mockAxiosInstance.patchForm.mockResolvedValueOnce(expectedResponse);

      const formData = { name: 'patched' };
      const result = await testHttp.patchForm('/upload/1', formData);

      expect(mockAxiosInstance.patchForm).toHaveBeenCalledWith('/upload/1', formData, undefined);
      expect(result).toEqual(expectedResponse);
    });
  });
});
