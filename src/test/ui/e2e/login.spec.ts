import { test } from '@playwright/test';
import config from 'config';

import { loginHelper } from '../common/helpers';
import { webElementsHelper } from '../common/helpers/element-helpers';
import { homePageObjects } from '../common/page-objects';

const { constants } = require('../common/data');

test.skip('Idam Login @PR', async ({ page }) => {
  await page.goto(config.get('e2e.testUrl'));
  await loginHelper.login(page);
  await new webElementsHelper().compareElementText(new homePageObjects(page).heading, constants.homePage.welcomeHeader);
});
