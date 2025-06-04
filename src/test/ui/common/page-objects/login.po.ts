import { Page } from '@playwright/test';

import { Base } from './base';

export class loginPageObjects extends Base {
  readonly heading = this.page.getByRole('heading', {
    name: 'Sign in or create an account',
  });
  readonly usernameInput = this.page.locator('#username');
  readonly passwordInput = this.page.locator('#password');
  readonly submitBtn = this.page.locator('[name="save"]');

  constructor(page: Page) {
    super(page);
  }
}
