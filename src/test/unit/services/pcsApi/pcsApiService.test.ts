import config from 'config';

import { getCitizenClaims, getRootGreeting, validateAccessCode } from '@services/pcsApi/pcsApiService';

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

  describe('validateAccessCode', () => {
    const accessToken = 'test-access-token';
    const caseId = '1234567890123456';
    const accessCode = 'ABCD12345678';

    test('should return valid true on 200 response', async () => {
      mockHttp.post.mockResolvedValue({ status: 200 });
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: true });
    });

    test('should return not_found error on 404 response', async () => {
      mockHttp.post.mockResolvedValue({ status: 404 });
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: false, error: 'not_found' });
    });

    test('should return expired error on 410 response', async () => {
      mockHttp.post.mockResolvedValue({ status: 410 });
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: false, error: 'expired' });
    });

    test('should return already_used error on 409 response', async () => {
      mockHttp.post.mockResolvedValue({ status: 409 });
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: false, error: 'already_used' });
    });

    test('should return mismatch error on 422 response', async () => {
      mockHttp.post.mockResolvedValue({ status: 422 });
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: false, error: 'mismatch' });
    });

    test('should return unknown error on unexpected status', async () => {
      mockHttp.post.mockResolvedValue({ status: 500 });
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: false, error: 'unknown' });
    });

    test('should return unknown error when request throws', async () => {
      mockHttp.post.mockRejectedValue(new Error('Network error'));
      const result = await validateAccessCode(accessToken, caseId, accessCode);
      expect(result).toEqual({ valid: false, error: 'unknown' });
    });
  });

  describe('getCitizenClaims', () => {
    const accessToken = 'test-access-token';

    test('returns array of claims on success', async () => {
      const claims = [{ caseReference: '1234567890123456', claimantName: 'John Doe', propertyPostcode: 'SW1A 1AA' }];
      mockHttp.get.mockResolvedValue({ data: claims });

      const result = await getCitizenClaims(accessToken);
      expect(result).toEqual(claims);
      expect(mockHttp.get).toHaveBeenCalledWith(
        `${testApiBase}/cases/citizen-claims`,
        expect.objectContaining({ headers: { Authorization: `Bearer ${accessToken}` } })
      );
    });

    test('throws when response data is not an array', async () => {
      mockHttp.get.mockResolvedValue({ data: null });
      await expect(getCitizenClaims(accessToken)).rejects.toThrow('Unexpected response from citizen-claims endpoint');
    });
  });
});
