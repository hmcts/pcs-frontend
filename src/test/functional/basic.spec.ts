import { expect, test } from '@playwright/test';

import { config as testConfig } from '../config';
import * as idamHelper from '../e2e/helpers/userHelpers/IdamHelper';
import { LandingPage } from '../e2e/page-objects/pages/cui/landing';
import { IdamPage } from '../e2e/page-objects/pages/idam.login';

test.skip('has title @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(testConfig.TEST_URL);
  await expect(page.locator('.govuk-heading-xl')).toHaveText('Welcome to the PCS home page');
});
test('login to application', async ({ page }) => {
  await page.goto(testConfig.TEST_URL);
  await idamHelper.deleteAccount(testConfig.userData.user.email);
  const userDetails = await idamHelper.createAccount(testConfig.userData);
  await new IdamPage(page).login(userDetails.email, testConfig.userData.password);
  await expect(new LandingPage(page).heading).toBeVisible();
});
