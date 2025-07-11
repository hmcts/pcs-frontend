import { AxeUtils } from '@hmcts/playwright-common';
import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { initializeExecutor, performAction } from '../utils/controller';

const claim_url = (config.get('e2e.testUrl') as string) + config.get('e2e.claimFormTestData.pageRoute');

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
  test('Journey of a claimant aged over 18', async ({ page }) => {
    await new AxeUtils(page).audit();
    await performAction('clickButton', 'Start');
    await new AxeUtils(page).audit();
    await performAction('clickRadioButton', 'Yes');
    await performAction('clickButton', 'Continue');
    await new AxeUtils(page).audit();
    await performAction('check', 'Persistent arrears (ground 11)');
    await performAction('clickButton', 'Continue');
    await new AxeUtils(page).audit();
  });
  test('Journey of a claimant aged under 18', async ({ page }) => {
    await performAction('clickButton', 'Start');
    await performAction('clickRadioButton', 'No');
    await performAction('clickButton', 'Continue');
    await new AxeUtils(page).audit();
    await performAction('clickButton', 'Exit application');
    await new AxeUtils(page).audit();
  });
});
