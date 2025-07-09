import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { initializeExecutor, performAction } from '../utils/controller';

const test_url: string = config.get('claimFormTestData.pageUrl');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: test_url,
    contentType: 'text/plain',
  });
  initializeExecutor(page);
  await performAction('login', 'citizen');
});

test.describe('Possession claims @PR @nightly', async () => {
  test('Journey of a claimant aged over 18', async () => {
    // performAction('clickButton', 'Start');
    // performAction('selectRadioButton', 'Yes');
    // performAction('check', 'Persistent arrears (ground 11)');
  });
  test('Journey of a claimant aged under 18', async () => {});
});
