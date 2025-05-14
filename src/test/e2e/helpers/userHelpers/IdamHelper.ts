import {config as testConfig} from '../../../config';

const restHelper = require('./restHelper');

const idamUrl = testConfig.IDAM_API
const idamTestingSupportUrl = testConfig.IDAM_TESTING_SUPPORT_USERS_URL
const loginEndpoint = testConfig.IDAM_TOKEN_ENDPOINT
const username = process.env.USERNAME
const password = process.env.PASSWORD
const client_secret = process.env.CLIENT_SECRET

export async function getAccessTokenFromIdam() {
  const details = {
    username: username,
    password: password,
    grant_type: testConfig.grant_type,
    scope: testConfig.scope,
    client_id: testConfig.client_id,
    client_secret: client_secret
  };
  const body = new URLSearchParams();
  for (let property in details) {
    const value = details[property as keyof typeof details];
    if (value !== undefined) {
      body.append(property, value);
    }
  }
  let headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  let url = `${idamUrl}/${loginEndpoint}`;
  return restHelper.retriedRequest(
    url,
    headers,
    body)
    .then(response => response.json()).then(data => data.access_token);
}
export async function createAccount(userData) {
  try {
    let authToken = await getAccessTokenFromIdam();
    console.log('Creating account with data:', JSON.stringify(userData));
    return restHelper.request(`${idamTestingSupportUrl}/test/idam/users`,
      {'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`}, JSON.stringify(userData))
      .then(response => response.json())
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

