import { accessTokenApiData, s2STokenApiData } from '../data/api-data';
import { user } from '../data/user-data';

/** Dynamic import for Sauce runner CJS/ESM compatibility. */
async function hmctsPlaywrightCommon() {
  return import('@hmcts/playwright-common');
}

async function getS2SToken(): Promise<void> {
  const { ServiceAuthUtils } = await hmctsPlaywrightCommon();
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
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

async function getAccessToken(): Promise<void> {
  const { IdamUtils } = await hmctsPlaywrightCommon();
  const password = user.claimantSolicitor.password;
  if (!password) {
    throw new Error(
      'Idam password is empty: set IDAM_PCS_USER_PASSWORD or IDAM_PCS_USER_PASSWORD_B64 for the Sauce job.'
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

/** Called from `auth.setup.ts` only when running under Sauce (tunnel up). */
export async function fetchSauceAuthTokens(): Promise<void> {
  await getS2SToken();
  await getAccessToken();
}
