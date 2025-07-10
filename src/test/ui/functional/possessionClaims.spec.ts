import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { initializeExecutor, performAction } from '../utils/controller';

const claim_url: string = config.get('e2e.claimFormTestData.pageUrl');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: claim_url,
    contentType: 'text/plain',
  });
  initializeExecutor(page);
  await performAction('NavigateToUrl', claim_url);
});

test.describe('Possession claims @PR @nightly', async () => {
  test('Journey of a claimant aged over 18', async () => {
    await performAction('clickButton', 'Start');
    await performAction('clickRadioButton', 'Yes');
    await performAction('clickButton', 'Continue');
    await performAction('check', 'Persistent arrears (ground 11)');
    await performAction('clickButton', 'Continue');
  });
  test('Journey of a claimant aged under 18', async () => {
    await performAction('clickButton', 'Start');
    await performAction('clickRadioButton', 'No');
    await performAction('clickButton', 'Continue');
    await performAction('clickButton', 'Exit application');
  });
});
