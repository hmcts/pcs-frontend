import { expect, test } from '@playwright/test';

test.describe('Sauce smoke @pcssaucelab', () => {
  test('Manage case exui test', async ({ page }) => {
    const password = process.env.IDAM_PCS_USER_PASSWORD || '';
    await page.goto('https://manage-case.aat.platform.hmcts.net');
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('pcs-solicitor-automation@test.com');
    await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
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
