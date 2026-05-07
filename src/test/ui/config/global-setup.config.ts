import fs from 'fs';
import path from 'path';

import { user } from '../data/user-data';

/** Matches Jenkins nightly `E2E_TARGET_ENV` and full slug URL templates. */
const NIGHTLY_ENV_SLUGS = new Set(['aat', 'demo', 'perftest', 'ithc']);

/** Derives IdAM / S2S URLs from `ENVIRONMENT` when unset (CNP nightly or local). */
export function applyPlaywrightServiceUrls(): void {
  const e = (process.env.ENVIRONMENT || '').toLowerCase();

  if (NIGHTLY_ENV_SLUGS.has(e)) {
    process.env.IDAM_WEB_URL ||= `https://idam-api.${e}.platform.hmcts.net`;
    process.env.IDAM_TESTING_SUPPORT_URL ||= `https://idam-testing-support-api.${e}.platform.hmcts.net`;
    process.env.S2S_URL ||= `http://rpe-service-auth-provider-${e}.service.core-compute-${e}.internal/testing-support/lease`;
  } else {
    process.env.IDAM_WEB_URL ||= 'https://idam-api.aat.platform.hmcts.net';
    process.env.IDAM_TESTING_SUPPORT_URL ||= 'https://idam-testing-support-api.aat.platform.hmcts.net';
    process.env.S2S_URL ||= 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease';
  }
}

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
  applyPlaywrightServiceUrls();
  if (!process.env.S2S_URL) {
    throw new Error(
      'S2S_URL is not set (set ENVIRONMENT to aat|demo|perftest|ithc, or export S2S_URL; otherwise AAT defaults apply via applyPlaywrightServiceUrls)'
    );
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
        microservice: 'pcs_api',
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
};

export const getAccessToken = async (): Promise<void> => {
  const { IdamUtils } = await import('@hmcts/playwright-common');
  applyPlaywrightServiceUrls();
  if (!process.env.IDAM_WEB_URL || !process.env.IDAM_TESTING_SUPPORT_URL) {
    throw new Error(
      'IDAM_WEB_URL and IDAM_TESTING_SUPPORT_URL are not set (set ENVIRONMENT to aat|demo|perftest|ithc, or export both URLs)'
    );
  }
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
