import { test } from '@playwright/test';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { webElementsHelper } from '../common/helpers/element-helpers';
import { homePageObjects } from '../common/page-objects';

const { constants } = require('../common/data');

const test_url = (process.env.TEST_URL as string) || config.get('e2e.testUrl');

test.skip('Idam Login @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(test_url);
  await loginHelper.login(page);
  await new webElementsHelper().compareElementText(new homePageObjects(page).heading, constants.homePage.welcomeHeader);
});
