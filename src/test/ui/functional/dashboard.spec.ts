import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import dashboard from '../common/data/dashboard';
import { loginHelper } from '../common/helpers';
import { initVerificationHelper, performVerification } from '../common/helpers/element-helpers/verification.helper';

const test_url: string = config.get('e2e.testURL');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  const dashboardURL = test_url + '/dashboard/1';
  await testInfo.attach('Page URL', {
    body: dashboardURL,
    contentType: 'text/plain',
  });
  initVerificationHelper(page);
  await page.goto(dashboardURL);
  await loginHelper.login(page);
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
