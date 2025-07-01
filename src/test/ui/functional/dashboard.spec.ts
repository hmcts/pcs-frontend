import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import dashboard from '../common/data/dashboard';
import { loginHelper } from '../common/helpers';
import { initActionHelper } from '../common/helpers/element-helpers';
import { initVerificationHelper, performVerification } from '../common/helpers/element-helpers/verification.helper';

const test_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initActionHelper(page);
  await parentSuite('Home Page');
  initVerificationHelper(page);
  await page.goto(test_url);
  await loginHelper.login(page);
  const dashboardURL = test_url + '/dashboard/1';
  await page.goto(dashboardURL);
});

test.describe('Verify Notifications and Tasks on Dashboard @PR @nightly', async () => {
  test('Verify hearing notification', async () => {
    const notification = dashboard.responseTimeElapsed('28');
    await performVerification('dashboardNotification', notification.title, notification.content);
  });
  test('Verify Pay Hearing Fee task', async () => {
    const payTheHearingFeeTaskList = dashboard.payTheHearingFee('28 June 2025', '4:00');
    await performVerification(
      'TaskListItem',
      payTheHearingFeeTaskList.title,
      'Action needed',
      'true',
      payTheHearingFeeTaskList.deadline
    );
  });
});
