import config from 'config';
import { TokenEndpointResponse } from 'oauth4webapi';

import { TestConfig, UserData } from '../../TestConfig';
import { request, retriedRequest } from '../../helpers/userHelpers/restHelper';

const testConfig = config.get<TestConfig>('e2e');
const username = config.get<string>('secrets.pcs.pcs-frontend-idam-system-username');
const password = config.get<string>('secrets.pcs.pcs-frontend-idam-system-password');
const clientSecret = config.get<string>('secrets.pcs.pcs-frontend-idam-secret');

export async function getAccessTokenFromIdam(): Promise<string> {
  const details = {
    username,
    password,
    grant_type: testConfig.grantType,
    scope: testConfig.scope,
    client_id: testConfig.clientId,
    client_secret: clientSecret,
  };
  const body = new URLSearchParams();
  for (const property in details) {
    const value = details[property];
    if (value !== undefined) {
      body.append(property, value);
    }
  }
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const url = `${testConfig.idamUrl}/${testConfig.loginEndpoint}`; // https://idam-api.aat.platform.hmcts.net/o/token
  //let responsePromise = await retriedRequest(url, headers, body, 'POST', 200);
  return request(url, headers, body)
    .then(response => response.json())
    .then((data: TokenEndpointResponse) => {
      return data.access_token;
    });
}

export async function createAccount(userData: UserData): Promise<Response | unknown> {
  try {
    const authToken = await getAccessTokenFromIdam();
    return retriedRequest(
      `${testConfig.idamTestingSupportUrl}/test/idam/users`,
      { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      JSON.stringify(userData) as BodyInit
    ).then(response => {
      return response.json();
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating account:', error);
    throw error;
  }
}

export async function deleteAccount(email: string): Promise<void> {
  try {
    const method = 'DELETE';
    await request(
      `${testConfig.idamTestingSupportUrl}/testing-support/accounts/${email}`,
      { 'Content-Type': 'application/json' },
      undefined,
      method
    );
    // eslint-disable-next-line no-console
    console.log('Account deleted: ' + email);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting account:', error);
    throw error;
  }
}

export async function getS2SToken(): Promise<string> {
  const s2sUrl = config.get('s2s.url');
  const body = JSON.stringify({ microservice: 'pcs_frontend' });
  const headers = {
    'Content-Type': 'application/json',
  };
  const url = `${s2sUrl}/testing-support/lease`;

  return request(url, headers, body).then(async response => {
    if (response.status !== 200) {
      throw new Error(`Failed to get S2S token, status code: ${response.status}`);
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader?.read()!;
      done = streamDone;
      if (value) {
        result += decoder.decode(value, { stream: true });
      }
    }
    console.log('response is fetching' + result);
    return result; // Return the full string
  });
}

//http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease
