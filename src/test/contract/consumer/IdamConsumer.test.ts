import { Matchers, Pact } from '@pact-foundation/pact';
import axios from 'axios';

const { like } = Matchers;

const mockProvider = new Pact({
  consumer: 'pcs_frontend',
  provider: 'idamApi_oidc',
  port: 5000,
  log: './pact/logs',
  dir: './pact/pacts',
  logLevel: 'debug',
});

let BASE_URL: string;

describe('Idam Consumer Pact Test', () => {
  beforeEach(async () => {
    await mockProvider.setup();
    await new Promise(res => setTimeout(res, 100));
    BASE_URL = mockProvider.mockService.baseUrl;
  });
  afterEach(async () => {
    await mockProvider.verify();
    await mockProvider.finalize();
  });

  const ACCESS_TOKEN = 'someAccessToken';

  test('should receive user information from /o/userinfo', async () => {
    const expectedUserInfo = {
      sub: 'caseworker@fake.hmcts.net',
      uid: '1111-2222-3333-4567',
      givenName: 'Case',
      familyName: 'Officer',
      roles: ['caseworker'],
    };

    await mockProvider.addInteraction({
      state: 'userinfo is requested',
      uponReceiving: 'a request to get user details',
      withRequest: {
        method: 'GET',
        path: '/o/userinfo',
        headers: {
          Authorization: ACCESS_TOKEN,
        },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like(expectedUserInfo),
      },
    });

    const response = await axios.get(`${BASE_URL}/o/userinfo`, {
      headers: {
        Authorization: ACCESS_TOKEN,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual(expectedUserInfo);
  });

  test('should receive access token from /o/token', async () => {
    const formData = {
      client_id: 'pcs_frontend',
      client_secret: 'AAAAAA',
      grant_type: 'authorization_code',
      redirect_uri: 'http://someRedirectURL',
      code: 'some_code',
    };

    const formBodyString = new URLSearchParams(formData).toString();

    await mockProvider.addInteraction({
      state: 'a token is requested',
      uponReceiving: 'a request to get the access token',
      withRequest: {
        method: 'POST',
        path: '/o/token',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBodyString,
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          access_token: like(ACCESS_TOKEN),
        },
      },
    });

    const response = await axios.post(`${BASE_URL}/o/token`, formBodyString, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      access_token: ACCESS_TOKEN,
    });
  });
});
