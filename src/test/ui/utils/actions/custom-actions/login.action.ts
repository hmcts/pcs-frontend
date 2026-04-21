import { Page } from '@playwright/test';

import { performAction } from '../../controller';
import { resolveIdamPassword } from '../../idamPassword';
import { IAction, actionData } from '../../interfaces';

export class LoginAction implements IAction {
  async execute(page: Page, action: string, userType?: actionData, roles?: actionData): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createUser', () => this.createUser(userType as string, roles as string[])],
      ['login', () => this.login()],
      ['generateCitizenAccessToken', () => this.generateCitizenAccessToken()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async login() {
    await performAction('inputText', 'Email address', process.env.IDAM_PCS_USER_EMAIL);
    await performAction('inputText', 'Password', resolveIdamPassword());
    await performAction('clickButton', 'Sign in');
  }

  private async createUser(userType: string, roles: string[]): Promise<void> {
    const token = process.env.BEARER_TOKEN as string;
    const password = resolveIdamPassword();
    const random7Digit = Math.floor(1000000 + Math.random() * 9000000);
    const email = (process.env.IDAM_PCS_USER_EMAIL = `TEST_PCS_USER.${userType}.${random7Digit}@test.test`);
    const forename = 'fn_' + random7Digit;
    const surname = 'sn_' + random7Digit;
    const { IdamUtils } = await import('@hmcts/playwright-common');
    await new IdamUtils().createUser({
      bearerToken: token,
      password,
      user: {
        email,
        forename,
        surname,
        roleNames: roles,
      },
    });
    await this.generateCitizenAccessToken();
  }

  private async generateCitizenAccessToken(): Promise<void> {
    const { IdamUtils } = await import('@hmcts/playwright-common');
    process.env.CITIZEN_ACCESS_TOKEN = await new IdamUtils().generateIdamToken({
      username: process.env.IDAM_PCS_USER_EMAIL,
      password: resolveIdamPassword(),
      grantType: 'password',
      clientId: 'pcs-frontend',
      clientSecret: process.env.PCS_FRONTEND_IDAM_SECRET as string,
      scope: 'profile openid roles',
    });
  }
}
