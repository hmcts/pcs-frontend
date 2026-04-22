import fs from 'fs';
import path from 'path';

import { test as setup } from '@playwright/test';

/**
 * Only referenced from `playwright.sauce.config.ts` (setup project). Not part of default Jenkins/local projects.
 */
const SETUP_ENV_PATH = path.join(__dirname, '../.auth/setup-env.json');

const KEYS_TO_SNAPSHOT = [
  'S2S_URL',
  'SERVICE_AUTH_TOKEN',
  'IDAM_WEB_URL',
  'IDAM_TESTING_SUPPORT_URL',
  'BEARER_TOKEN',
] as const;

setup.describe.configure({ mode: 'serial' });

setup('S2S and IDAM for API helpers (Sauce)', async () => {
  const { fetchSauceAuthTokens } = await import('../utils/sauce-auth-tokens');
  await fetchSauceAuthTokens();

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
