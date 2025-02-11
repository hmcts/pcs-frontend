import { getIdamToken, getRedirectUrl, getUserDetails, idamTokenCache } from '../../../../main/modules/auth';
import { PageLink } from '../../../../main/steps/urls';

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import config from 'config';

jest.mock('config');

const mockAxios = new MockAdapter(axios);
const serviceUrl = 'http://localhost';
const callbackUrlPageLink: PageLink = '/callback';

describe('OIDC Module', () => {
  beforeEach(() => {
    mockAxios.reset();
    idamTokenCache.flushAll();
  });

  describe('getRedirectUrl', () => {
    it('should return the correct redirect URL', () => {
      (config.get as jest.Mock).mockReturnValueOnce('client-id').mockReturnValueOnce('http://login-url');
      const result = getRedirectUrl(serviceUrl, callbackUrlPageLink);
      expect(result).toBe(
        'http://login-url?client_id=client-id&response_type=code&redirect_uri=http://localhost/callback'
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return user details', async () => {
      const idToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwidWlkIjoiMTIzIiwiZ2l2ZW5fbmFtZSI6IkpvaG4iLCJmYW1pbHlfbmFtZSI6IkRvZSIsInJvbGVzIjpbInJvbGUxIl19.s5g5s5g5s5g5s5g5s5g5s5g5s5g5s5g5s5g5s5g5s5g';
      const accessToken = 'mock-access-token';
      const jwtPayload = {
        uid: '123',
        sub: 'user@example.com',
        given_name: 'John',
        family_name: 'Doe',
        roles: ['role1'],
      };
      (config.get as jest.Mock)
        .mockReturnValueOnce('client-id')
        .mockReturnValueOnce('client-secret')
        .mockReturnValueOnce('http://token-url');
      mockAxios.onPost('http://token-url').reply(200, { id_token: idToken, access_token: accessToken });

      const result = await getUserDetails(serviceUrl, 'auth-code', callbackUrlPageLink);
      expect(result).toEqual({
        accessToken,
        id: jwtPayload.uid,
        email: jwtPayload.sub,
        givenName: jwtPayload.given_name,
        familyName: jwtPayload.family_name,
        roles: jwtPayload.roles,
      });
    });
  });

  describe('getIdamToken', () => {
    it('should return cached token if caching is enabled', async () => {
      const params = { username: 'user', password: 'pass' };
      const cacheKey = 'cache-key';
      const idToken = 'mock-id-token';
      const accessToken = 'mock-access-token';
      (config.get as jest.Mock).mockReturnValueOnce('true');
      idamTokenCache.set(cacheKey, { data: { id_token: idToken, access_token: accessToken } });

      const result = await getIdamToken(params, cacheKey);
      expect(result).toEqual({ data: { id_token: idToken, access_token: accessToken } });
    });

    it('should create and return new token if caching is disabled', async () => {
      const params = { username: 'user', password: 'pass' };
      const cacheKey = 'cache-key';
      const idToken = 'mock-id-token';
      const accessToken = 'mock-access-token';
      (config.get as jest.Mock)
        .mockReturnValueOnce('false')
        .mockReturnValueOnce('client-id')
        .mockReturnValueOnce('client-secret')
        .mockReturnValueOnce('http://token-url');
      mockAxios.onPost('http://token-url').reply(200, { id_token: idToken, access_token: accessToken });

      const result = await getIdamToken(params, cacheKey);
      expect(result.data).toEqual({ id_token: idToken, access_token: accessToken });
    });
  });
});
