import { Page } from '@playwright/test';
import config from 'config';

import { loginPageObjects } from '../page-objects';

import { buildUserDataWithRole } from './testConfig';
import * as idamHelper from './user-helpers/idam.helper';

export class loginHelper {
  static async login(page: Page): Promise<void> {
    const loginPage = new loginPageObjects(page);
    const password =
      (process.env.PCS_FRONTEND_IDAM_USER_TEMP_PASSWORD as string) ||
      config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
    const userData = buildUserDataWithRole(config.get('e2e.roles'), password);

    await idamHelper.createAccount(userData);

    await loginPage.usernameInput.fill(userData.user.email);
    await loginPage.passwordInput.fill(password);
    await loginPage.submitBtn.click();
    await idamHelper.deleteAccount(userData.user.email);
  }
}
