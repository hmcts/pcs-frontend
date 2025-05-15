import { v4 as uuidv4 } from 'uuid'; // Add this import at the top of the file

// better handling of unhandled exceptions
process.on('unhandledRejection', reason => {
  throw reason;
});

function buildUser(role: string) {
  return {
    id: uuidv4(), // Make sure to run: yarn add uuid @types/uuid
    email: `${role}-${Math.random().toString(36).slice(2, 9).toLowerCase()}@gmail.com`,
    forename: `fn_citizen_${Math.random().toString(36).slice(2, 15)}`,
    surname: `sn_citizen_${Math.random().toString(36).slice(2, 15)}`,
    roleNames: ['citizen', 'caseworker-pcs'],
  };
}

export const config = {
  TEST_URL: process.env.TEST_URL || 'http://localhost:3209',
  IDAM_API: process.env.IDAM_API || 'https://idam-api.aat.platform.hmcts.net',
  IDAM_TESTING_SUPPORT_USERS_URL: 'https://idam-testing-support-api.aat.platform.hmcts.net',
  IDAM_TOKEN_ENDPOINT: process.env.IDAM_TOKEN_ENDPOINT || 'o/token',
  grant_type: process.env.GRANT_TYPE || 'password',
  scope: process.env.SCOPE || 'profile openid roles',
  client_id: process.env.CLIENT_ID || 'civil_citizen_ui',
  helpers: {},
  userData: {
    password: process.env.PCS_FRONTEND_IDAM_USER_TEMP_PASSWORD,
    user: buildUser('citizen'),
  },
};

config.helpers = {
  Playwright: {
    url: config.TEST_URL,
  },
};
