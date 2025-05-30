import { Page } from '@playwright/test';

import { Base } from './base';

export class homePageObjects extends Base {
  readonly heading = this.page.locator('h1:has-text("Welcome")');

  constructor(page: Page) {
    super(page);
  }
}
