import { type Page, type TestInfo, expect, test } from '@playwright/test';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';
import { initializeExecutor, performAction } from '../utils/controller';
import { resolveIdamPassword } from '../utils/idamPassword';

const PCS_AAT_URL = 'https://pcs.aat.platform.hmcts.net/';
const MANAGE_CASE_URL = 'https://manage-case.aat.platform.hmcts.net';

async function attachFullPagePng(testInfo: TestInfo, page: Page, filename: string) {
  await testInfo.attach(filename, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test.describe('Sauce smoke', () => {
  test('Manage case exui test @pcssaucelab', async ({ page }, testInfo) => {
    const email = process.env.IDAM_PCS_USER_EMAIL?.trim() || 'pcs-solicitor-automation@test.com';
    const password = resolveIdamPassword();
    test.skip(!password);
    await page.goto(MANAGE_CASE_URL, { waitUntil: 'domcontentloaded' });
    await attachFullPagePng(testInfo, page, 'mc-ui-01-sign-in.png');
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('link', { name: 'Create case' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-02-after-login.png');
    await page.getByRole('link', { name: 'Create case' }).click();
    await expect(page.getByLabel('Case type')).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-03-case-type.png');
    await page.getByLabel('Case type').selectOption('PCS');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-04-after-start.png');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('textbox', { name: 'Enter a UK postcode' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-05-postcode.png');
    await page.getByRole('textbox', { name: 'Enter a UK postcode' }).fill('w37rx');
    await page.getByRole('button', { name: 'Find address' }).click();
    await expect(page.getByLabel('Select an address')).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-06-address-list.png');
    await page.getByLabel('Select an address').selectOption('2: Object');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: 'Save and continue' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-07-before-save.png');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('load');
    await attachFullPagePng(testInfo, page, 'mc-ui-08-after-save.png');
  });

  /**
   * Fetches S2S + IDAM tokens in the test worker, then PCS createUser/login (uses BEARER_TOKEN).
   * Restores solicitor env before Manage Case UI — createUser overwrites IDAM_PCS_USER_EMAIL.
   */
  test('Manage case with token setup and PCS login @pcssaucelab', async ({ page }, testInfo) => {
    await getS2SToken();
    await getAccessToken();

    initializeExecutor(page);
    await performAction('navigateToUrl', PCS_AAT_URL);
    await attachFullPagePng(testInfo, page, 'pcs-ui-01-after-navigate.png');
    await performAction('createUser', 'citizen', ['citizen']);
    await attachFullPagePng(testInfo, page, 'pcs-ui-02-after-create-user.png');
    await performAction('login');
    // Proof of PCS login: left Idam / sign-in URL and landed on PCS host.
    await expect(page).toHaveURL(/pcs\.aat\.platform\.hmcts\.net/i, { timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'pcs-ui-03-after-login.png');
  });

  test('Service Token s2s - 200 @pcssaucelab', async ({ request }) => {
    const res = await request.post(
      'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease',
      { headers: { 'Content-Type': 'application/json' }, data: { microservice: 'pcs_api' } }
    );
    expect(res.status()).toBe(200);
  });
});
