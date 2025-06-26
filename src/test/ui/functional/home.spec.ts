import { test } from '@playwright/test';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { initActionHelper } from '../common/helpers/element-helpers';
import { initVerificationHelper, performVerification } from '../common/helpers/element-helpers/verification.helper';

const test_url = (process.env.TEST_URL as string) || config.get('e2e.testUrl');

test.beforeEach(async ({ page }) => {
  initActionHelper(page);
  initVerificationHelper(page);
  await page.goto(test_url);
  await loginHelper.login(page);
  const dashboardURL = test_url + '/dashboard/1';
  await page.goto(dashboardURL);
});

test('Idam Login @accessibility @PR @nightly', async () => {
  await performVerification('verifyPageTitle', 'GOV.UK - The best place to find government services and information');
});

test.describe('Verify Notifications and Tasks on Dashboard @PR @nightly', async () => {
  test('Verify hearing notification', async () => {
    await performVerification(
      'dashboardNotification',
      'Trial or hearing scheduled',
      'Your appointment is on 20 May 2025 at 11:30am in London. You need to pay £76.00 by 20 May 2025. View the hearing notice.'
    );
  });
  test('Verify Upload hearing documents task', async () => {
    await performVerification('taskListItem', 'verify-text-link', 'Upload hearing documents', '');
    await performVerification('taskListItem', 'verify-status', 'Upload hearing documents', 'Action needed');
    await performVerification(
      'taskListItem',
      'verify-deadline',
      'Upload hearing documents',
      'Deadline is 4:00 pm on 20 May 2025'
    );
  });
});
