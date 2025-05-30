import {test} from '@playwright/test';
import config from 'config';
import {loginHelper} from '../common/helpers';
import {webElementsHelper} from "../common/helpers/element-helpers";
import {homePageObjects} from "../common/page-objects";
const {constants} = require('../common/data');

test('Idam Login', async ({ page }) => {
  await page.goto(config.get('e2e.testURL'));
  await new loginHelper(page).login();
  await new webElementsHelper().compareElementText(new homePageObjects(page).heading, constants.homePage.welcomeHeader)
});
