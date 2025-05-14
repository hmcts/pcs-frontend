import { config as testConfig } from '../../../config';
import { request, retriedRequest } from '../../helpers/userHelpers/restHelper';

const idamUrl = testConfig.IDAM_API;
const idamTestingSupportUrl = testConfig.IDAM_TESTING_SUPPORT_USERS_URL;
const loginEndpoint = testConfig.IDAM_TOKEN_ENDPOINT;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const client_secret = process.env.CLIENT_SECRET;

export async function getAccessTokenFromIdam() {
  const details = {
    username,
    password,
    grant_type: testConfig.grant_type,
    scope: testConfig.scope,
    client_id: testConfig.client_id,
    client_secret,
  };
  const body = new URLSearchParams();
  for (const property in details) {
    const value = details[property as keyof typeof details];
    if (value !== undefined) {
      body.append(property, value);
    }
  }
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const url = `${idamUrl}/${loginEndpoint}`;
  return retriedRequest(url, headers, body)
    .then(response => response.json())
    .then(data => data.access_token);
}

export async function createAccount(userData) {
  try {
    const authToken = await getAccessTokenFromIdam();
    return retriedRequest(
      `${idamTestingSupportUrl}/test/idam/users`,
      { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      JSON.stringify(userData)
    ).then(response => response.json());
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}
export async function deleteAccount(email) {
  try {
    const method = 'DELETE';
    await request(`${idamUrl}/test/idam/users/${email}`, { 'Content-Type': 'application/json' }, undefined, method);
    console.log('Account deleted: ' + email);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
