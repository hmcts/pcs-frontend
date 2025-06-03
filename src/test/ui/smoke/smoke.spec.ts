import { test } from '@playwright/test';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { homePageObjects } from '../common/page-objects';

test('Home page', async ({ page }) => {
  await page.goto(config.get('e2e.testURL'));
  await loginHelper.login(page);
  await new homePageObjects(page).heading.isVisible();
});
