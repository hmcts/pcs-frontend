import { expect, test } from '@playwright/test';

import { config as testConfig } from '../config';

<<<<<<< HEAD
test.skip('has title @accessibility @PR @nightly', async ({ page }) => {
=======
test('has title @accessibility @PR @nightly', async ({ page }) => {
>>>>>>> 227da3d (HDPI-359: fixing the unit test and build errors)
  await page.goto(testConfig.TEST_URL);

  await expect(page.locator('.govuk-heading-xl')).toHaveText('Welcome to the PCS home page');
});
