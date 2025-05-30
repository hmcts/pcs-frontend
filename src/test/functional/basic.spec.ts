import { expect, test, request } from '@playwright/test';
import config from 'config';
import { getDashboardNotifications } from '../../main/services/pcsApi';

import { http } from '../../main/modules';

import { buildUserDataWithRole, readDashboardNotifications } from '../e2e/TestConfig';
import * as idamHelper from '../e2e/helpers/userHelpers/IdamHelper';
import { LandingPage } from '../e2e/page-objects/pages/cui/landing';
import { IdamPage } from '../e2e/page-objects/pages/idam.login';

import axios from 'axios';
import { getS2SToken } from '../e2e/helpers/userHelpers/IdamHelper';

const s2s = getS2SToken();
console.log('s2s' + s2s);

test.skip('has title @accessibility @PR @nightly', async ({ page }) => {
  await page.goto(config.get('e2e.testURL'));
  await expect(page.locator('.govuk-heading-xl')).toHaveText('Welcome to the PCS home page');
});
test.skip('login to application', async ({ page }) => {
  let landing = new LandingPage(page);
  await page.goto(config.get('e2e.testURL'));
  const password = config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
  const userData = buildUserDataWithRole('citizen', password);
  await idamHelper.deleteAccount(userData.user.email);
  await idamHelper.createAccount(userData);
  console.log(userData.user.email, password);
  await new IdamPage(page).login(userData.user.email, password);
  expect(await landing.heading.isVisible());
  console.log(await landing.heading.textContent());
});

test('integration test', async ({ page }) => {
  let landing = new LandingPage(page);
  await page.goto(config.get('e2e.testURL'));
  const password = config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
  const userData = buildUserDataWithRole('citizen', password);
  await idamHelper.deleteAccount(userData.user.email);
  await idamHelper.createAccount(userData);
  await new IdamPage(page).login(userData.user.email, password);
  console.log(userData.user.email, password);
  await new LandingPage(page).heading.isVisible();
  await page.goto(config.get('e2e.testURL') + '/dashboard/1');
  const s2sToken = await getS2SToken();
  http.setToken(s2sToken, 3600);
  const res = await getDashboardNotifications(1);
  console.log('Notifications fetched successfully:', res);
  // You can add assertions here to check the notifications
  expect(res).toBeDefined();
  expect(res.length).toBeGreaterThan(0); // Example assertion
});

/*test.skip('mock getDashboardNotifications using routes', async ({page}) => {
  await page.goto(config.get('e2e.testURL'));
  const password = config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
  const userData = buildUserDataWithRole('citizen', password);
  await idamHelper.deleteAccount(userData.user.email);
  await idamHelper.createAccount(userData);
  await new IdamPage(page).login(userData.user.email, password);
  const url = config.get('api.url');
  await page.route(`${url}/dashboard/1`, (route) => {
    route.fulfill({
      status: 200,
      headers:
        {
          contentType: 'application/json',
          serviceAuthorization: ``,
        },
      body: JSON.stringify([]),
    });
  });
  const notifications = await getDashboardNotifications(1);
  expect(notifications).toBeNull();
  /*expect(notifications.length).toBe(2);
  expect(notifications[0].templateId).toBe('mock-template-1');
  expect(notifications[1].templateId).toBe('mock-template-2');*/
