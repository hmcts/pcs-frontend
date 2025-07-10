import { Page } from '@playwright/test';
import config from 'config';

import { performAction } from '../../controller';
import { getUser } from '../../helpers/idam-helpers/idam.helper';
import { IAction } from '../../interfaces/action.interface';

export class LoginAction implements IAction {
  async execute(page: Page, userKey: string): Promise<void> {
    const userCreds = getUser(userKey);
    if (!userCreds) {
      throw new Error(`No credentials found for key: ${userKey}`);
    }
    await page.goto(config.get('e2e.testUrl') as string);

    await performAction('fill', 'Email address', userCreds.email);
    await performAction('fill', 'Password', userCreds.password);
    await performAction('clickButton', 'Sign in');
  }
}
