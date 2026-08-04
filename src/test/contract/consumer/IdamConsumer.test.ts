import { MatchersV3, PactV3 } from '@pact-foundation/pact/src/v3';
import axios from 'axios';

const { like } = MatchersV3;

const mockProvider = new PactV3({
  consumer: 'pcs_frontend',
  provider: 'idamApi_oidc',
  dir: './pact/pacts',
});

describe('Idam Consumer Pact Test', () => {
  const ACCESS_TOKEN = 'someAccessToken';

  test('should receive user information from /o/userinfo', async () => {
    const expectedUserInfo = {
      sub: 'caseworker@fake.hmcts.net',
      uid: '1111-2222-3333-4567',
      givenName: 'Case',
      familyName: 'Officer',
      roles: ['caseworker'],
    };

    mockProvider.addInteraction({
      states: [{ description: 'userinfo is requested' }],
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

    await mockProvider.executeTest(async mockserver => {
      const response = await axios.get(`${mockserver.url}/o/userinfo`, {
        headers: {
          Authorization: ACCESS_TOKEN,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual(expectedUserInfo);
    });
  });

  test('should receive access token from /o/token', async () => {
    const formData = {
      client_id: 'pcs_frontend',
      client_secret: 'AAAAAA',
      grant_type: 'authorization_code',
      redirect_uri: 'http://someRedirectURL',
      code: 'some_code',
      username: 'caseworker@fake.hmcts.net',
      password: 'password',
    };

    const formBodyString = new URLSearchParams(formData).toString();

    mockProvider.addInteraction({
      states: [{ description: 'a token is requested' }],
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

    await mockProvider.executeTest(async mockserver => {
      const response = await axios.post(`${mockserver.url}/o/token`, formBodyString, {
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

  test('a request made to a .well-known endpoint', async () => {
    const expectedResponse = {
      request_parameter_supported: true,
      claims_parameter_supported: false,
      scopes_supported: ['openid'],
      issuer: 'https://idam-web-public.aat.platform.hmcts.net/o',
      id_token_encryption_enc_values_supported: ['A256GCM'],
      acr_values_supported: [],
      authorization_endpoint: 'https://idam-web-public.aat.platform.hmcts.net/o/authorize',
      request_object_encryption_enc_values_supported: ['A256GCM'],
      rcs_request_encryption_alg_values_supported: ['RSA-OAEP'],
      claims_supported: [],
      rcs_request_signing_alg_values_supported: ['PS384'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      token_endpoint: 'https://idam-web-public.aat.platform.hmcts.net/o/token',
      response_types_supported: ['code'],
      request_uri_parameter_supported: true,
      rcs_response_encryption_enc_values_supported: ['A256GCM'],
      end_session_endpoint: 'https://idam-web-public.aat.platform.hmcts.net/o/endSession',
      rcs_request_encryption_enc_values_supported: ['A256GCM'],
      version: '3.0',
      rcs_response_encryption_alg_values_supported: ['RSA-OAEP'],
      userinfo_endpoint: 'https://idam-web-public.aat.platform.hmcts.net/o/userinfo',
      id_token_encryption_alg_values_supported: ['RSA-OAEP'],
      jwks_uri: 'https://idam-web-public.aat.platform.hmcts.net/o/jwks',
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES384'],
      request_object_signing_alg_values_supported: ['ES384'],
      request_object_encryption_alg_values_supported: ['RSA-OAEP'],
      rcs_response_signing_alg_values_supported: ['PS384'],
    };

    mockProvider.addInteraction({
      states: [{ description: '.well-known endpoint' }],
      uponReceiving: 'a request for configuration',
      withRequest: {
        method: 'GET',
        path: '/o/.well-known/openid-configuration',
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like(expectedResponse),
      },
    });

    await mockProvider.executeTest(async mockserver => {
      const response = await axios.get(`${mockserver.url}/o/.well-known/openid-configuration`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual(expectedResponse);
    });
  });
});
