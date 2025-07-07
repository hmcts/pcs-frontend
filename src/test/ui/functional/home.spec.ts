import { AxeUtils } from '@hmcts/playwright-common';
import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { initVerificationHelper, performVerification } from '../common/helpers/element-helpers/verification.helper';

const { constants } = require('../common/data');

const test_url: string = config.get('e2e.testUrl');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: test_url,
    contentType: 'text/plain',
  });
  initVerificationHelper(page);
  await page.goto(test_url);
  await loginHelper.login(page);
});

test('Idam Login @accessibility @PR @nightly', async ({ page }) => {
  await performVerification('verifyPageTitle', constants.homePage.title);
  await new AxeUtils(page).audit();
});
