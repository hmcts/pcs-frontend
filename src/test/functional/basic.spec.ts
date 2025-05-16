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
  await idamHelper.createAccount(testConfig.userData);
  const pwd = testConfig.userData.password === undefined ? '' : testConfig.userData.password;
  await new IdamPage(page).login(testConfig.userData.user.email, pwd);
  await new LandingPage(page).heading.waitFor({ state: 'visible' });
});
