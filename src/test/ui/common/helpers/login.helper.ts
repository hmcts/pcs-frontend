import {buildUserDataWithRole} from "./testConfig";
import config from 'config';
import { Page } from '@playwright/test';
import * as idamHelper from "./user-helpers/idam.helper";
import {loginPageObjects} from "../page-objects";

export class loginHelper {
  private readonly loginPage: loginPageObjects;

  constructor(page: Page) {
    this.loginPage = new loginPageObjects(page);
  }

  async login(): Promise<void> {
    const password = config.get<string>('secrets.pcs.pcs-frontend-idam-user-temp-password');
    const userData = buildUserDataWithRole(config.get('e2e.roles'), password);
    await idamHelper.deleteAccount(userData.user.email);
    await idamHelper.createAccount(userData);
    await this.loginPage.usernameInput.fill(userData.user.email);
    await this.loginPage.passwordInput.fill(password);
    await this.loginPage.submitBtn.click();
  }
}
