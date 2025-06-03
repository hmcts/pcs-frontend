import { test } from '@playwright/test';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { homePageObjects } from '../common/page-objects';

test.skip('Home page @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(config.get('e2e.testUrl'));
  await loginHelper.login(page);
  await new homePageObjects(page).heading.isVisible();
});
