import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

const test_url = (process.env.TEST_URL as string) || config.get('e2e.testUrl');

test.beforeEach(async ({ page }) => {
  await parentSuite('Home Page');
  const possessionClaimStartPage = test_url + '/steps/page1';
  await page.goto(possessionClaimStartPage);
  //   await loginAction.login(page);
});

test.describe('Possession claims @PR @nightly', async () => {
  test('Journey of a claimant aged over 18', async () => {
    // performAction('clickButton', 'Start');
    // performAction('selectRadioButton', 'Yes');
    // performAction('check', 'Persistent arrears (ground 11)');
  });
  test('Journey of a claimant aged under 18', async () => {});
});
