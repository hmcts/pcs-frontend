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
  await performVerification('verifyPageTitle', constants.homePage.title);
});

test('Dashboard Notifications @PR @nightly', async ({ page }) => {
  const dashboardURL = test_url + '/dashboard/1';
  await page.goto(dashboardURL);
  await page.waitForURL(dashboardURL);
  const notifications1 = dashboard.responseTimeElapsed('28');
  await performVerification('dashboardNotification', notifications1.title, notifications1.content);
  const taskList = dashboard.payTheHearingFee('28 June 2025');
  await performVerification('taskInList', taskList.title, 'Action needed', 'true', 'true', taskList.deadline);
});
