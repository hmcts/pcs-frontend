import { Page } from '@playwright/test';
import config from 'config';

import { initActionHelper, performAction } from './element-helpers';
import * as idamHelper from './idam-helpers/idam.helper';
import { buildUserDataWithRole } from './idam-helpers/testConfig';

export class loginHelper {
  static async login(page: Page): Promise<void> {
    initActionHelper(page);
    const password = config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
    const userData = buildUserDataWithRole(config.get('e2e.roles'), password);

    await idamHelper.createAccount(userData);

    await performAction('fill', 'Email address', userData.user.email);
    await performAction('fill', 'Password', password);
    await performAction('click', 'Sign in');
    await idamHelper.deleteAccount(userData.user.email);
  }
}
