import { expect, test } from '@playwright/test';

test.describe('Sauce smoke', () => {
  test('Manage case exui test @pcssaucelab', async ({ page }) => {
    const email = process.env.IDAM_PCS_USER_EMAIL?.trim() || 'pcs-solicitor-automation@test.com';
    const b64 = process.env.IDAM_PCS_USER_PASSWORD_B64?.trim();
    const password = b64
      ? Buffer.from(b64, 'base64').toString('utf8').trim()
      : (process.env.IDAM_PCS_USER_PASSWORD ?? '').trim();
    test.skip(!password);
    await page.goto('https://manage-case.aat.platform.hmcts.net', { waitUntil: 'domcontentloaded' });
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

  test('Service Token s2s - 200 @pcssaucelab', async ({ request }) => {
    const res = await request.post(
      'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease',
      { headers: { 'Content-Type': 'application/json' }, data: { microservice: 'pcs_api' } },
    );
    expect(res.status()).toBe(200);
  });
});
