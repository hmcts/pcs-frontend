import fs from 'fs';
import path from 'path';

import { test as setup } from '@playwright/test';

import { clearEmvLocksIfLocal, getAccessToken, getS2SToken } from './config/global-setup.config';

const SETUP_ENV_PATH = path.join(__dirname, '.auth/setup-env.json');

const KEYS_TO_SNAPSHOT = [
  'S2S_URL',
  'SERVICE_AUTH_TOKEN',
  'IDAM_WEB_URL',
  'IDAM_TESTING_SUPPORT_URL',
  'BEARER_TOKEN',
] as const;

setup.describe.configure({ mode: 'serial' });

setup('S2S and IDAM tokens for test workers', async () => {
  clearEmvLocksIfLocal();
  await getS2SToken();
  await getAccessToken();

  fs.mkdirSync(path.dirname(SETUP_ENV_PATH), { recursive: true });
  const snapshot: Record<string, string> = {};
  for (const key of KEYS_TO_SNAPSHOT) {
    const value = process.env[key];
    if (value !== undefined) {
      snapshot[key] = value;
    }
  }
  fs.writeFileSync(SETUP_ENV_PATH, JSON.stringify(snapshot), 'utf8');
});
