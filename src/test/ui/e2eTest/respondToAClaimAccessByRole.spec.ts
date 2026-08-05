import { expect } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { startNow } from '../data/page-data';
import { user } from '../data/user-data';
import { DASHBOARD_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-enabled');
  process.env.NOTICE_SERVED = 'YES';
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  logTestEnvAfterBeforeEach(testInfo.title, DASHBOARD_BEFORE_EACH_ENV_KEYS);
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('getCaseAPI');
  await performAction('navigateToUrl', home_url);
});

test.describe('CUI user role access @PR @nightly', async () => {
  test('Unauthenticated user login', async ({ page }) => {
    await performAction('login', user.unauthorizedUser.email);
    expect(page.url()).toContain('/login');
  });

  test('Authenticated HMCTS User Cannot Access Possession Claims from Civil Claims', async ({ page }) => {
    await performAction('login', user.authenticatedCivilUser.email);
    expect(page.url()).toContain('/login');
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/dashboard`);
    expect(page.url()).toContain('/login');
  });

  test('Solicitor role should not have access to specific pages', async () => {
    await performAction('login', user.defendantSolicitor.email);
    await performAction('navigateToUrl', home_url + `/respond-to-claim/task-list`);
    await performValidation('mainHeader', 'You do not have access to this page');
    await performAction('navigateToUrl', home_url + `/view-documents`);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performValidation('mainHeader', startNow.mainHeader);
  });
});
