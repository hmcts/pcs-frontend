import { AxeUtils } from '@hmcts/playwright-common';
import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { initActionHelper } from '../common/helpers/element-helpers';
import { initVerificationHelper, performVerification } from '../common/helpers/element-helpers/verification.helper';

const { constants } = require('../common/data');

const test_url: string = config.get('e2e.testURL');

test.beforeEach(async ({ page }) => {
  await test.step('Navigating to Home Page', async () => {
    await page.goto(test_url);
  });
  initActionHelper(page);
  await parentSuite('Home Page');
  initVerificationHelper(page);
  await loginHelper.login(page);
});

test('Idam Login @accessibility @PR @nightly', async ({ page }) => {
  await performVerification('verifyPageTitle', constants.homePage.title);
  await new AxeUtils(page).audit();
});
