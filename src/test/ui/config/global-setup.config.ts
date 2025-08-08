import { IdamUtils } from '@hmcts/playwright-common';
import config from 'config';

async function globalSetupConfig(): Promise<void> {
  await getAccessToken();
}

export const getAccessToken = async (): Promise<void> => {
  process.env.IDAM_WEB_URL = config.get<string>('e2e.idamUrl');
  process.env.IDAM_TESTING_SUPPORT_URL = config.get<string>('e2e.idamTestingSupportUrl');
  process.env.CREATE_USER_BEARER_TOKEN = await new IdamUtils().generateIdamToken({
    grantType: 'client_credentials',
    clientId: config.get<string>('e2e.clientId'),
    clientSecret: config.get<string>('e2e.secrets.pcs-frontend-idam-secret'),
    scope: 'profile roles',
  });
};
export default globalSetupConfig;
