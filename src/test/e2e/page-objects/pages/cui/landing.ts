import { Page } from '@playwright/test';

import { Base } from '../../base';
import config from 'config';

export class LandingPage extends Base {
  readonly heading = this.page.locator('govuk-heading-xl');
  readonly notificationValues = this.page.locator('.govuk-notification-banner__content');

  // Replace with actual URL
  constructor(page: Page) {
    super(page);
  }

  async getHeadingText(): Promise<string> {
    return (await this.heading.textContent()) || '';
  }
}
