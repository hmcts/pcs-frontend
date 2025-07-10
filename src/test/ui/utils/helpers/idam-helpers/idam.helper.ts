import * as fs from 'fs';
import * as path from 'path';

import config from 'config';
import { TokenEndpointResponse } from 'oauth4webapi';

import { request, retriedRequest } from './rest.helper';
import { TestConfig, UserData, buildUserDataWithRole } from './testConfig';

const testConfig = config.get<TestConfig>('e2e');
const username = config.get<string>('e2e.secrets.pcs-frontend-idam-system-username');
const password = config.get<string>('e2e.secrets.pcs-frontend-idam-system-password');
const clientSecret = config.get<string>('e2e.secrets.pcs-frontend-idam-secret');
export async function createTempUser(userKey: string, roles: string[]): Promise<void> {
  const Password = config.get<string>('e2e.secrets.pcs-idam-test-user-password');
  const userData = buildUserDataWithRole(roles, Password, userKey);
  await createAccount(userData);

  setTempUser(userKey, {
    email: userData.user.email,
    password: Password,
    temp: true,
    roles,
  });
}

export async function cleanupTempUsers(): Promise<void> {
  const all = getAllUsers();
  for (const [key, creds] of Object.entries(all)) {
    if (creds.temp) {
      await deleteAccount(creds.email);
      deleteTempUser(key);
    }
  }
}

export async function createAccount(userData: UserData): Promise<Response | unknown> {
  const authToken = await getAccessTokenFromIdam();
  return retriedRequest(
    `${testConfig.idamTestingSupportUrl}/test/idam/users`,
    { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    JSON.stringify(userData) as BodyInit
  ).then(response => {
    return response.json();
  });
}

export async function deleteAccount(email: string): Promise<void> {
  const method = 'DELETE';
  await request(
    `${testConfig.idamTestingSupportUrl}/testing-support/accounts/${email}`,
    { 'Content-Type': 'application/json' },
    undefined,
    method
  );
}

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
  const url = `${testConfig.idamUrl}/${testConfig.loginEndpoint}`;
  return request(url, headers, body)
    .then(response => response.json())
    .then((data: TokenEndpointResponse) => {
      return data.access_token;
    });
}

export interface UserCredentials {
  email: string;
  password: string;
  temp?: boolean;
  roles: string[];
}

const storePath = path.resolve(__dirname, './../../../data/.temp-users.data.json');

let tempUsers: Record<string, UserCredentials> = {};

if (fs.existsSync(storePath)) {
  const data = fs.readFileSync(storePath, 'utf-8');
  tempUsers = JSON.parse(data);
}

function saveTempUsers(): void {
  fs.writeFileSync(storePath, JSON.stringify(tempUsers, null, 2));
}

export function setTempUser(key: string, creds: UserCredentials): void {
  tempUsers[key] = creds;
  saveTempUsers();
}

export function deleteTempUser(key: string): void {
  delete tempUsers[key];
  saveTempUsers();
}

export function getUser(key: string): UserCredentials | undefined {
  return tempUsers[key];
}

export function getAllUsers(): Record<string, UserCredentials> {
  return { ...tempUsers };
}
