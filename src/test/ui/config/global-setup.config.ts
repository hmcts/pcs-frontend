import { IdamUtils, ServiceAuthUtils } from '@hmcts/playwright-common';

import { accessTokenApiData, s2STokenApiData } from '../data/api-data';
import { user } from '../data/user-data';

async function globalSetupConfig(): Promise<void> {
  await getS2SToken();
  await getUserAccessToken();
  await getAccessToken();
}

export const getS2SToken = async (): Promise<void> => {
  process.env.S2S_URL = s2STokenApiData.s2sUrl;
  process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
    microservice: s2STokenApiData.microservice,
  });
};

export const getUserAccessToken = async (): Promise<void> => {
  process.env.IDAM_WEB_URL = accessTokenApiData.idamUrl;
  process.env.IDAM_TESTING_SUPPORT_URL = accessTokenApiData.idamTestingSupportUrl;
  process.env.CREATE_USER_BEARER_TOKEN = await new IdamUtils().generateIdamToken({
    grantType: 'client_credentials',
    clientId: 'pcs-frontend',
    clientSecret: process.env.PCS_FRONTEND_IDAM_SECRET as string,
    scope: 'profile roles',
  });
};

export const getAccessToken = async (): Promise<void> => {
  process.env.BEARER_TOKEN = await new IdamUtils().generateIdamToken({
    username: user.claimantSolicitor.email,
    password: user.claimantSolicitor.password,
    grantType: 'password',
    clientId: 'pcs-api',
    clientSecret: process.env.PCS_API_IDAM_SECRET as string,
    scope: 'profile openid roles',
  });
};

export default globalSetupConfig;
