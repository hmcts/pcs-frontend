import { config as testConfig } from '../config';

import { expect, test } from '@playwright/test';

test.skip('has title @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(testConfig.TEST_URL);

  await expect(page.locator('.govuk-heading-xl')).toHaveText('Welcome to the PCS home page');
});
