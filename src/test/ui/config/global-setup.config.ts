import fs from 'fs';
import path from 'path';

import { accessTokenApiData, s2STokenApiData } from '../data/api-data';
import { user } from '../data/user-data';

async function globalSetupConfig(): Promise<void> {
  if (!process.env.CI) {
    clearEmvLocks();
  }
  await getS2SToken();
  await getAccessToken();
}

const clearEmvLocks = (): void => {
  const lockDir = path.join(process.cwd(), 'test-results', 'pft-locks');
  fs.rmSync(lockDir, { recursive: true, force: true });
};

const getS2SToken = async (): Promise<void> => {
  // saucectl: agent already forwarded SERVICE_AUTH_TOKEN via .sauce/config.yml — do not call *.internal from Sauce VMs.
  if (process.env.SERVICE_AUTH_TOKEN?.trim()) {
    if (!process.env.S2S_URL?.trim()) {
      process.env.S2S_URL = s2STokenApiData.s2sUrl;
    }
    return;
  }
  const { ServiceAuthUtils } = await import('@hmcts/playwright-common');
  process.env.S2S_URL = s2STokenApiData.s2sUrl;
  process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
    microservice: s2STokenApiData.microservice,
  });
};

const getAccessToken = async (): Promise<void> => {
  process.env.IDAM_WEB_URL = accessTokenApiData.idamUrl;
  process.env.IDAM_TESTING_SUPPORT_URL = accessTokenApiData.idamTestingSupportUrl;
  // saucectl: agent already forwarded BEARER_TOKEN — do not call Idam from Sauce VMs.
  if (process.env.BEARER_TOKEN?.trim()) {
    return;
  }
  const { IdamUtils } = await import('@hmcts/playwright-common');
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
