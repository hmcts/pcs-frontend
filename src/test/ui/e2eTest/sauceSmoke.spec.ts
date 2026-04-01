import { expect, test } from '@playwright/test';

test.describe('Sauce smoke', () => {
  test('Manage case exui test @pcssaucelab', async ({ page }, testInfo) => {
    const email = process.env.IDAM_PCS_USER_EMAIL?.trim() || 'pcs-solicitor-automation@test.com';
    const password = (process.env.IDAM_PCS_USER_PASSWORD ?? '').trim();
    test.skip(!password, 'IDAM_PCS_USER_PASSWORD is missing or empty.');
    await testInfo.attach('sauce-env-diagnostics.json', {
      body: Buffer.from(
        JSON.stringify({
          passwordLength: password.length,
          emailLength: email.length,
          idamPasswordEnvPresent: process.env.IDAM_PCS_USER_PASSWORD !== undefined,
        }),
        'utf-8'
      ),
      contentType: 'application/json',
    });

    await page.goto('https://manage-case.aat.platform.hmcts.net', {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
    const passwordField = page.getByRole('textbox', { name: 'Password' });
    await passwordField.fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('link', { name: 'Create case' })).toBeVisible({
      timeout: 90_000,
    });
    await page.getByRole('link', { name: 'Create case' }).click();
    await page.getByLabel('Case type').selectOption('PCS');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Enter a UK postcode' }).click();
    await page.getByRole('textbox', { name: 'Enter a UK postcode' }).fill('w37rx');
    await page.getByRole('button', { name: 'Find address' }).click();
    await page.getByLabel('Select an address').selectOption('2: Object');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
  });

  test('Service Token s2s - 200', async ({ request }) => {
    const RPE_LEASE_URL =
      'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease';
    const response = await request.post(RPE_LEASE_URL, {
      headers: { 'Content-Type': 'application/json' },
      data: { microservice: 'pcs_api' },
    });
    expect(response.status()).toBe(200);
  });
});
