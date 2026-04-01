import { accessTokenApiData, s2STokenApiData } from '../data/api-data';
import { user } from '../data/user-data';

/** Dynamic import: package is ESM-only; Sauce Playwright runner loads tests as CJS (`require` cannot load ESM). */
async function hmctsPlaywrightCommon() {
  return import('@hmcts/playwright-common');
}

export async function getS2SToken(): Promise<void> {
  const { ServiceAuthUtils } = await hmctsPlaywrightCommon();
  process.env.S2S_URL = s2STokenApiData.s2sUrl;
  process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
    microservice: s2STokenApiData.microservice,
  });
}

export async function getAccessToken(): Promise<void> {
  const { IdamUtils } = await hmctsPlaywrightCommon();
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
}

/** S2S + Idam tokens — invoked from `authTest` `beforeEach` (not globalSetup). */
export async function ensureAuthTokens(): Promise<void> {
  await getS2SToken();
  await getAccessToken();
}
