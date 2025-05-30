import { expect, test } from '@playwright/test';
import config from 'config';

import { buildUserDataWithRole } from '../e2e/TestConfig';
import * as idamHelper from '../e2e/helpers/userHelpers/IdamHelper';
import { LandingPage } from '../e2e/page-objects/pages/cui/landing';
import { IdamPage } from '../e2e/page-objects/pages/idam.login';

test.skip('has title @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(config.get('e2e.testURL'));
  await expect(page.locator('.govuk-heading-xl')).toHaveText('Welcome to the PCS home page');
});
test('login to application', async ({ page }) => {
  await page.goto(config.get('e2e.testURL'));
  const password = config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
  const userData = buildUserDataWithRole('citizen', password);
  await idamHelper.deleteAccount(userData.user.email);
  await idamHelper.createAccount(userData);
  await new IdamPage(page).login(userData.user.email, password);
  await new LandingPage(page).heading.isVisible();
});
