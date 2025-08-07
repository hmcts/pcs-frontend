import { AxeUtils } from '@hmcts/playwright-common';
import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const { constants } = require('../data');

const test_url: string = config.get('e2e.testUrl');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: test_url,
    contentType: 'text/plain',
  });
  initializeExecutor(page);
  await performAction('navigateToUrl', test_url);
  await performAction('login', 'citizen');
});

test.skip('Idam Login @accessibility @PR @nightly', async ({ page }) => {
  await performValidation('pageTitle', { title: constants.homePage.title });
  await new AxeUtils(page).audit();
});
