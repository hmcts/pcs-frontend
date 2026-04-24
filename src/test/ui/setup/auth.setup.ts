import fs from 'fs';
import path from 'path';

import { test as setup } from '@playwright/test';

import { clearEmvLocksIfLocal, getAccessToken, getS2SToken } from '../config/global-setup.config';
import { accessTokenApiData, s2STokenApiData } from '../data/api-data';

const SETUP_ENV_PATH = path.join(__dirname, '../.auth/setup-env.json');

const KEYS_TO_SNAPSHOT = [
  'S2S_URL',
  'SERVICE_AUTH_TOKEN',
  'IDAM_WEB_URL',
  'IDAM_TESTING_SUPPORT_URL',
  'BEARER_TOKEN',
] as const;

setup.describe.configure({ mode: 'serial' });

// Tags so this project is not filtered out when Playwright/Sauce use @nightly (Jenkins VM) or @crossbrowser (saucectl).
setup('@nightly @crossbrowser setup: S2S and IDAM tokens for API helpers', async () => {
  clearEmvLocksIfLocal();
  // Jenkins can export SERVICE_AUTH_TOKEN + BEARER_TOKEN before saucectl (no tunnel for token calls on Sauce VMs).
  const tokensFromCi = process.env.SERVICE_AUTH_TOKEN?.trim() && process.env.BEARER_TOKEN?.trim();
  if (tokensFromCi) {
    process.env.S2S_URL = process.env.S2S_URL || s2STokenApiData.s2sUrl;
    process.env.IDAM_WEB_URL = process.env.IDAM_WEB_URL || accessTokenApiData.idamUrl;
    process.env.IDAM_TESTING_SUPPORT_URL =
      process.env.IDAM_TESTING_SUPPORT_URL || accessTokenApiData.idamTestingSupportUrl;
  } else {
    await getS2SToken();
    await getAccessToken();
  }

  fs.mkdirSync(path.dirname(SETUP_ENV_PATH), { recursive: true });
  const snapshot: Record<string, string> = {};
  for (const key of KEYS_TO_SNAPSHOT) {
    const value = process.env[key];
    if (typeof value === 'string') {
      snapshot[key] = value;
    }
  }
  fs.writeFileSync(SETUP_ENV_PATH, JSON.stringify(snapshot), 'utf8');
});
