import { expect, test } from '@playwright/test';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { initActionHelper, performAction } from '../common/helpers/element-helpers';

const { constants } = require('../common/data');

const test_url = (process.env.TEST_URL as string) || config.get('e2e.testUrl');

test.beforeEach(async ({ page }) => {
  initActionHelper(page);
});

test('Idam Login @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(test_url);
  await loginHelper.login(page);
  await performAction('verifyPageTitle', constants.homePage.title);
});

test('Home page displays Hello from Alex Date', async ({ page }) => {
  await page.goto(test_url);
  await loginHelper.login(page);
  await expect(page.getByText('Hello from Alex')).toBeVisible();
});
