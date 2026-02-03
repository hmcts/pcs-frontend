// Create a shared mock function that can be accessed from isolated modules
const mockWriteFileSync = jest.fn();

// Mock node:fs before importing the module
jest.mock('node:fs', () => ({
  writeFileSync: mockWriteFileSync,
}));

// Mock console.error to avoid noise in test output
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {
  // Suppress console.error in tests
});

// Mock process.exit to prevent actual process termination
// We'll just track calls without actually exiting
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  // Do nothing - just track the call
  return undefined as never;
}) as jest.SpyInstance;

describe('generateFlagData', () => {
  const originalEnv = process.env.LAUNCHDARKLY_SDK_KEY;
  const mockFetch = jest.fn() as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
    mockWriteFileSync.mockClear();

    // Setup global fetch mock
    global.fetch = mockFetch;

    // Reset environment variable
    delete process.env.LAUNCHDARKLY_SDK_KEY;
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv) {
      process.env.LAUNCHDARKLY_SDK_KEY = originalEnv;
    } else {
      delete process.env.LAUNCHDARKLY_SDK_KEY;
    }

    // Clear module cache to allow re-importing with different mocks
    jest.resetModules();
  });

  describe('when LAUNCHDARKLY_SDK_KEY is not set', () => {
    it('should throw an error and exit with code 1', async () => {
      delete process.env.LAUNCHDARKLY_SDK_KEY;

      // Use isolateModules to ensure fresh import
      await jest.isolateModulesAsync(async () => {
        await import('../../../../main/modules/launch-darkly/generateFlagData');
        // Wait for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error generating flag data:',
        expect.objectContaining({
          message: 'LAUNCHDARKLY_SDK_KEY is not set in environment variables',
        })
      );
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe('when LAUNCHDARKLY_SDK_KEY is set', () => {
    const testSdkKey = 'test-sdk-key-12345';
    const testUrl = `https://sdk.launchdarkly.com/sdk/latest-all?sdkKey=${testSdkKey}`;
    const mockFlagData = {
      flags: {
        'test-flag': {
          key: 'test-flag',
          on: true,
          version: 1,
        },
      },
    };

    beforeEach(() => {
      process.env.LAUNCHDARKLY_SDK_KEY = testSdkKey;
    });

    it('should fetch flag data successfully and write to flagdata.json', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFlagData,
      });

      await jest.isolateModulesAsync(async () => {
        // Ensure the mock is available in the isolated context
        jest.doMock('node:fs', () => ({
          writeFileSync: mockWriteFileSync,
        }));
        await import('../../../../main/modules/launch-darkly/generateFlagData');
      });

      // Wait for async operations to complete with retry mechanism
      let attempts = 0;
      const maxAttempts = 20;
      while (mockWriteFileSync.mock.calls.length === 0 && attempts < maxAttempts) {
        await new Promise(resolve => setImmediate(resolve));
        attempts++;
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(testUrl, {
        headers: {
          Authorization: testSdkKey,
        },
      });

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileSync).toHaveBeenCalledWith('flagdata.json', JSON.stringify(mockFlagData, null, 2));

      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('should handle fetch errors and exit with code 1', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(fetchError);

      await jest.isolateModulesAsync(async () => {
        await import('../../../../main/modules/launch-darkly/generateFlagData');
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith('Error generating flag data:', fetchError);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should handle non-ok HTTP responses and exit with code 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        status: 401,
      });

      await jest.isolateModulesAsync(async () => {
        await import('../../../../main/modules/launch-darkly/generateFlagData');
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error generating flag data:',
        expect.objectContaining({
          message: 'Failed to fetch flag data: Unauthorized',
        })
      );
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors and exit with code 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await jest.isolateModulesAsync(async () => {
        await import('../../../../main/modules/launch-darkly/generateFlagData');
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error generating flag data:',
        expect.objectContaining({
          message: 'Invalid JSON',
        })
      );
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should format JSON with proper indentation (2 spaces)', async () => {
      const complexFlagData = {
        flags: {
          'flag-1': { key: 'flag-1', on: true },
          'flag-2': { key: 'flag-2', on: false, variations: [{ value: 'A' }, { value: 'B' }] },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => complexFlagData,
      });

      await jest.isolateModulesAsync(async () => {
        // Ensure the mock is available in the isolated context
        jest.doMock('node:fs', () => ({
          writeFileSync: mockWriteFileSync,
        }));
        await import('../../../../main/modules/launch-darkly/generateFlagData');
      });

      // Wait for async operations to complete with retry mechanism
      let attempts = 0;
      const maxAttempts = 20;
      while (mockWriteFileSync.mock.calls.length === 0 && attempts < maxAttempts) {
        await new Promise(resolve => setImmediate(resolve));
        attempts++;
      }

      expect(mockWriteFileSync).toHaveBeenCalledWith('flagdata.json', JSON.stringify(complexFlagData, null, 2));

      // Verify the formatting includes proper indentation
      const writtenContent = mockWriteFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('\n  ');
      expect(writtenContent).toContain('\n    ');
    });
  });
});
