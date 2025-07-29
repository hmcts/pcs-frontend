import { Page } from '@playwright/test';

import { performAction } from '../../controller';
import { getUser } from '../../helpers/idam-helpers/idam.helper';
import { IAction } from '../../interfaces/action.interface';

export class LoginAction implements IAction {
  async execute(page: Page, userKey: string): Promise<void> {
    const userCreds = getUser(userKey);
    if (!userCreds) {
      throw new Error(`No credentials found for key: ${userKey}`);
    }
    await performAction('inputText', 'Email address', userCreds.email);
    await performAction('inputText', 'Password', userCreds.password);
    await performAction('clickButton', 'Sign in');
  }
}
