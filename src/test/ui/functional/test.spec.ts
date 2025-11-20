import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const baseUrl = (config.get('e2e.testUrl') as string);

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: baseUrl,
    contentType: 'text/plain',
  });
  initializeExecutor(page);
  await performAction('createUserAndLogin', ['citizen']);
});

test.describe('Possession claims @PR @nightly', async () => {
  test('Verify home page', async () => {
    await performAction('navigateToUrl', baseUrl);
    await performValidation('mainHeader', 'Home Page');
  });
});
