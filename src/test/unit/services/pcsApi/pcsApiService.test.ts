import axios from 'axios';
import config from 'config';

import { OIDCConfig } from '../../../../main/modules/oidc/config.interface';
import { CourtVenue } from '../../../../main/services/pcsApi/courtVenue.interface';
import { getCourtVenues, getRootGreeting } from '../../../../main/services/pcsApi/pcsApiService';

jest.mock('axios');
jest.mock('config');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedConfig = config.get as jest.Mock;

describe('pcsApiService', () => {
  const apiBaseUrl = 'http://mock-api';
  const idamUrl = 'http://mock-idam';
  const oidcMock: OIDCConfig = {
    clientId: 'test-client-id',
    issuer: 'test-client-secret',
    redirectUri: 'http://localhost/callback',
    scope: 'openid profile',
    iss: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedConfig.mockImplementation((key: string) => {
      const values: Record<string, string | OIDCConfig> = {
        'api.url': apiBaseUrl,
        'idam.url': idamUrl,
        oidc: oidcMock,
        'secrets.pcs.idam-system-user-name': 'mock-user',
        'secrets.pcs.idam-system-user-password': 'mock-pass',
        'secrets.pcs.pcs-frontend-idam-secret': 'mock-secret',
      };

      return values[key];
    });
  });

  it('should fetch root greeting', async () => {
    const mockGreeting = 'Hello from PCS!';
    mockedAxios.get.mockResolvedValueOnce({ data: mockGreeting });

    const result = await getRootGreeting();

    expect(result).toEqual(mockGreeting);
    expect(mockedAxios.get).toHaveBeenCalledWith(apiBaseUrl);
  });

  it('should fetch court venues by postcode', async () => {
    const mockAccessToken = 'mock-access-token';
    const mockPostcode = 'SW1A 1AA';

    const mockCourtVenues: CourtVenue[] = [{ epimId: 101, id: 2001, name: 'Test Court' }];

    // Mock IDAM token POST
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: mockAccessToken },
    });

    // Mock PCS court venue GET
    mockedAxios.get.mockResolvedValueOnce({
      data: mockCourtVenues,
    });

    const result = await getCourtVenues(mockPostcode);

    expect(result).toEqual(mockCourtVenues);

    expect(mockedAxios.post).toHaveBeenCalledWith(`${idamUrl}/o/token`, expect.any(URLSearchParams), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(`${apiBaseUrl}/courts?postcode=${encodeURIComponent(mockPostcode)}`, {
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });
  });
});
