import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import dashboard from '../data/dashboard';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const dashboard_url: string = config.get('e2e.dashboard.pageUrl');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: dashboard_url,
    contentType: 'text/plain',
  });
  initializeExecutor(page);
  await performAction('NavigateToUrl', dashboard_url);
  await performAction('login', 'citizen');
});

test.describe('Verify Notifications and Tasks on Dashboard @PR @nightly', async () => {
  test('Verify hearing notification', async () => {
    const notification = dashboard.responseTimeElapsed('28');
    await performValidation('dashboardNotification', { title: notification.title, content: notification.content });
  });
  test('Verify Pay Hearing Fee task', async () => {
    const payTheHearingFeeTaskList = dashboard.payTheHearingFee('28 June 2025', '4:00');
    await performValidation('dashboardTask', {
      title: payTheHearingFeeTaskList.title,
      status: 'Action needed',
      taskHasLink: true,
      deadline: payTheHearingFeeTaskList.deadline,
    });
  });
});
