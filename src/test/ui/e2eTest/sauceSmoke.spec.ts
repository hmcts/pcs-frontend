import { expect, test } from '@playwright/test';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';
import { initializeExecutor, performAction } from '../utils/controller';
import { resolveIdamPassword } from '../utils/idamPassword';

const PCS_AAT_URL = 'https://pcs.aat.platform.hmcts.net/';
const MANAGE_CASE_URL = 'https://manage-case.aat.platform.hmcts.net';

test.describe('Sauce smoke', () => {
  test('Manage case exui test @pcssaucelab', async ({ page }) => {
    const email = process.env.IDAM_PCS_USER_EMAIL?.trim() || 'pcs-solicitor-automation@test.com';
    const password = resolveIdamPassword();
    test.skip(!password);
    await page.goto(MANAGE_CASE_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('link', { name: 'Create case' })).toBeVisible({ timeout: 90_000 });
    await page.getByRole('link', { name: 'Create case' }).click();
    await page.getByLabel('Case type').selectOption('PCS');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Enter a UK postcode' }).fill('w37rx');
    await page.getByRole('button', { name: 'Find address' }).click();
    await page.getByLabel('Select an address').selectOption('2: Object');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
  });

  /**
   * Fetches S2S + IDAM tokens in the test worker, then PCS createUser/login (uses BEARER_TOKEN).
   * Restores solicitor env before Manage Case UI — createUser overwrites IDAM_PCS_USER_EMAIL.
   */
  test('Manage case with token setup and PCS login @pcssaucelab', async ({ page }) => {
    await getS2SToken();
    await getAccessToken();

    initializeExecutor(page);
    await performAction('navigateToUrl', PCS_AAT_URL);
    await performAction('createUser', 'citizen', ['citizen']);
    await performAction('login');
    await page.waitForTimeout(5000);
  });

  test('Service Token s2s - 200 @pcssaucelab', async ({ request }) => {
    const res = await request.post(
      'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease',
      { headers: { 'Content-Type': 'application/json' }, data: { microservice: 'pcs_api' } }
    );
    expect(res.status()).toBe(200);
  });
});
