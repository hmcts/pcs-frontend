import config from 'config';

import { getRootGreeting, validateAccessCode } from '@services/pcsApi/pcsApiService';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('@modules/http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    setToken: jest.fn(),
    setTokenRegenerator: jest.fn(),
  },
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

const testApiBase = 'http://mock-api';
const mockHttp = require('../../../../main/modules/http').http;

describe('pcsApiService', () => {
  beforeEach(() => {
    (config.get as jest.Mock).mockReturnValue(testApiBase);
    jest.clearAllMocks();
  });

  test('should fetch root greeting', async () => {
    const expectedGreeting = 'test greeting';
    mockHttp.get.mockResolvedValue({ data: expectedGreeting });

    const actualGreeting = await getRootGreeting();
    expect(actualGreeting).toEqual(expectedGreeting);
    expect(mockHttp.get).toHaveBeenCalledWith(testApiBase);
  });

  test('should handle error when fetching root greeting', async () => {
    const error = new Error('Network error');
    mockHttp.get.mockRejectedValue(error);

    await expect(getRootGreeting()).rejects.toThrow('Network error');
    expect(mockHttp.get).toHaveBeenCalledWith(testApiBase);
  });

  test('should validate access code successfully', async () => {
    mockHttp.post.mockResolvedValue({ status: 200, data: { success: true } });

    const accessToken = 'test-access-token';
    const caseId = '1234567890123456';
    const accessCode = 'ABC123';

    const result = await validateAccessCode(accessToken, caseId, accessCode);

    expect(result).toBe(true);
    expect(mockHttp.post).toHaveBeenCalledWith(
      `${testApiBase}/cases/${caseId}/validate-access-code`,
      { accessCode },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  });

  test('should return false when access code validation fails', async () => {
    const error = new Error('Invalid access code');
    mockHttp.post.mockRejectedValue(error);

    const accessToken = 'test-access-token';
    const caseId = '1234567890123456';
    const accessCode = 'INVALID';

    const result = await validateAccessCode(accessToken, caseId, accessCode);

    expect(result).toBe(false);
    expect(mockHttp.post).toHaveBeenCalledWith(
      `${testApiBase}/cases/${caseId}/validate-access-code`,
      { accessCode },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  });

  test('should return false when API error occurs during access code validation', async () => {
    mockHttp.post.mockRejectedValue(new Error('Network error'));

    const accessToken = 'test-access-token';
    const caseId = '1234567890123456';
    const accessCode = 'XYZ789';

    const result = await validateAccessCode(accessToken, caseId, accessCode);

    expect(result).toBe(false);
  });
});
