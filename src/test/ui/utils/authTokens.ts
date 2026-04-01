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
  const password = user.claimantSolicitor.password;
  if (!password) {
    throw new Error(
      'Idam password is empty: set IDAM_PCS_USER_PASSWORD or IDAM_PCS_USER_PASSWORD_B64 for the Sauce job (must match Jenkins vault / Idam user pcs-solicitor-automation@test.com).'
    );
  }
  process.env.IDAM_WEB_URL = accessTokenApiData.idamUrl;
  process.env.IDAM_TESTING_SUPPORT_URL = accessTokenApiData.idamTestingSupportUrl;
  process.env.BEARER_TOKEN = await new IdamUtils().generateIdamToken({
    username: user.claimantSolicitor.email,
    password,
    grantType: 'password',
    clientId: 'pcs-frontend',
    clientSecret: process.env.PCS_FRONTEND_IDAM_SECRET as string,
    scope: 'profile openid roles',
  });
}

/** S2S + Idam — invoked from `authTest` worker fixture once per worker (not globalSetup, not per test). */
export async function ensureAuthTokens(): Promise<void> {
  await getS2SToken();
  await getAccessToken();
}
