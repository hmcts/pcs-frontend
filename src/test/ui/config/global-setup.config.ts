import fs from 'fs';
import path from 'path';

import { accessTokenApiData, s2STokenApiData } from '../data/api-data';
import { user } from '../data/user-data';

/** Clears PFT lock dir on local runs only (skipped when CI is set). */
export function clearEmvLocksIfLocal(): void {
  if (process.env.CI) {
    return;
  }
  const lockDir = path.join(process.cwd(), 'test-results', 'pft-locks');
  fs.rmSync(lockDir, { recursive: true, force: true });
}

export const getS2SToken = async (): Promise<void> => {
  const { ServiceAuthUtils } = await import('@hmcts/playwright-common');
  process.env.S2S_URL = process.env.S2S_URL || s2STokenApiData.s2sUrl;

  const maxAttempts = 4;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
        microservice: s2STokenApiData.microservice,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      // Intermittent Sauce tunnel/DNS failures happen; retry with small backoff.
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
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

async function globalSetupConfig(): Promise<void> {
  clearEmvLocksIfLocal();
}

export default globalSetupConfig;
