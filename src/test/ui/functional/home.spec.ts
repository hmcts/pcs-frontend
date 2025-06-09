import config from 'config';

import { loginHelper } from '../common/helpers';
import { test } from '../common/helpers/database.fixture';
import { webElementsHelper } from '../common/helpers/element-helpers';
import { homePageObjects } from '../common/page-objects';

const { constants, testData } = require('../common/data');

const test_url = (process.env.TEST_URL as string) || config.get('e2e.testUrl');

test('Idam Login @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(test_url);
  await loginHelper.login(page);
  await new webElementsHelper().compareElementText(new homePageObjects(page).heading, constants.homePage.welcomeHeader);
});

test('DB connection', async ({ connectDB }) => {
  //table name and columns are defined in src/test/common/data/test-data.ts
  const res = await connectDB.fetchTable(testData.table);
  console.log(res);
});
