import { IdamUtils } from '@hmcts/playwright-common';
import { Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

import { performAction } from '../../controller';
import { IAction, actionData } from '../../interfaces/action.interface';

export class LoginAction implements IAction {
  async execute(page: Page, action: string, userType?: actionData, roles?: actionData): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createUserAndLogin', () => this.createUserAndLogin(userType as string, roles as string[])],
      ['login', () => this.login()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {throw new Error(`No action found for '${action}'`);}
    await actionToPerform();
  }

  private async login() {
    await performAction('inputText', 'Email address', process.env.IDAM_PCS_USER_EMAIL);
    await performAction('inputText', 'Password', process.env.IDAM_PCS_USER_PASSWORD);
    await performAction('clickButton', 'Sign in');
  }

  private async createUserAndLogin(userType: string, roles: string[]): Promise<void> {
    const token = process.env.CREATE_USER_BEARER_TOKEN as string;
    const password = process.env.PCS_IDAM_TEST_USER_PASSWORD as string;
    const uniqueId = uuidv4();
    const email = process.env.IDAM_PCS_USER_EMAIL = `TEST_PCS_USER.${userType}.${uniqueId}@test.test`;
    const forename = 'fn_' + uniqueId.split('-')[0];
    const surname = 'sn_' + uniqueId.split('-')[1];
    await new IdamUtils().createUser({
      bearerToken: token,
      password,
      user: {
        email,
        forename,
        surname,
        roleNames: roles
      }
    });
    await this.login();
  }
}
