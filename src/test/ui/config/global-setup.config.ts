import fs from 'fs';
import path from 'path';

import { accessTokenApiData, s2STokenApiData } from '../data/api-data';
import { user } from '../data/user-data';

const SETUP_ENV_PATH = path.join(__dirname, '../.auth/setup-env.json');

const SETUP_ENV_KEYS = [
  'SERVICE_AUTH_TOKEN',
  'BEARER_TOKEN',
  'S2S_URL',
  'IDAM_WEB_URL',
  'IDAM_TESTING_SUPPORT_URL',
] as const;

function writeSetupEnvSnapshot(): void {
  const dir = path.dirname(SETUP_ENV_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const payload: Record<string, string> = {};
  for (const key of SETUP_ENV_KEYS) {
    const v = process.env[key];
    if (typeof v === 'string' && v.trim()) {
      payload[key] = v;
    }
  }
  fs.writeFileSync(SETUP_ENV_PATH, JSON.stringify(payload), 'utf8');
}

function isSauceFlow(): boolean {
  return process.env.PLAYWRIGHT_SAUCE_FULL_JOURNEY_ARTIFACTS === 'true';
}

async function globalSetupConfig(): Promise<void> {
  if (!process.env.CI) {
    clearEmvLocks();
  }

  if (isSauceFlow()) {
    if (!process.env.SERVICE_AUTH_TOKEN?.trim() || !process.env.BEARER_TOKEN?.trim()) {
      throw new Error(
        'Sauce run: SERVICE_AUTH_TOKEN and BEARER_TOKEN must be set in the environment (e.g. .sauce/config-sauce-nightly.yml or yarn e2e:issue-sauce-auth-tokens on the agent). GlobalSetup does not call S2S/IDAM on Sauce.'
      );
    }
  } else {
    await getS2SToken();
    await getAccessToken();
  }

  writeSetupEnvSnapshot();
}

const clearEmvLocks = (): void => {
  const lockDir = path.join(process.cwd(), 'test-results', 'pft-locks');
  fs.rmSync(lockDir, { recursive: true, force: true });
};

export const getS2SToken = async (): Promise<void> => {
  const { ServiceAuthUtils } = await import('@hmcts/playwright-common');
  process.env.S2S_URL = s2STokenApiData.s2sUrl;
  process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
    microservice: s2STokenApiData.microservice,
  });
};

export const getAccessToken = async (): Promise<void> => {
  const { IdamUtils } = await import('@hmcts/playwright-common');
  process.env.IDAM_WEB_URL = accessTokenApiData.idamUrl;
  process.env.IDAM_TESTING_SUPPORT_URL = accessTokenApiData.idamTestingSupportUrl;
  process.env.BEARER_TOKEN = await new IdamUtils().generateIdamToken({
    username: user.claimantSolicitor.email,
    password: user.claimantSolicitor.password,
    grantType: 'password',
    clientId: 'pcs-frontend',
    clientSecret: process.env.PCS_FRONTEND_IDAM_SECRET as string,
    scope: 'profile openid roles',
  });
};

export default globalSetupConfig;
