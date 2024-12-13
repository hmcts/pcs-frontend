import { expect, test } from '@playwright/test';

import { config as testConfig } from '../config';

test('has title @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(testConfig.TEST_URL);

  await expect(page.locator('.govuk-heading-xl')).toHaveText('Welcome to the PCS home page');
});
