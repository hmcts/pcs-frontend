import { test } from '@playwright/test';
import config from 'config';

import dashboard from '../common/data/dashboard';
import { loginHelper } from '../common/helpers';
import { initActionHelper } from '../common/helpers/element-helpers';
import { initVerificationHelper, performVerification } from '../common/helpers/element-helpers/verification.helper';

const { constants } = require('../common/data');

const test_url = (process.env.TEST_URL as string) || config.get('e2e.testUrl');

test.beforeEach(async ({ page }) => {
  initActionHelper(page);
  initVerificationHelper(page);
  await page.goto(test_url);
  await loginHelper.login(page);
});

test('Idam Login @accessibility @PR @nightly', async () => {
  await performVerification('verifyPageTitle', "GOV.UK - The best place to find government services and information");
});

test('Dashboard Notifications @accessibility @PR @nightly', async ({ page }) => {
  const dashboardURL = test_url + '/dashboard/1';
  await page.goto(dashboardURL);

  await performVerification('dashboardNotification', 'Trial or hearing scheduled',
    'Your appointment is on 20 May 2025 at 11:30am in London. You need to pay £76.00 by 20 May 2025. View the hearing notice.');

  await performVerification('taskInList', 'verify-text-link', 'Make a claim / View claim', 'Available');
  await performVerification('taskInList', 'verify-text', "View documents", 'Not available yet');
});
