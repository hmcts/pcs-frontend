import { Page, expect } from '@playwright/test';

import { IValidation, ValidationData } from '../../interfaces/validation.interface';

export class DashboardNotificationValidation implements IValidation {
  async validate(page: Page, fiedName: string, data: ValidationData): Promise<void> {
    try {
      const notification = page.locator(
        `
                   div:has(h2:text("${data.title}"))~ div:has-text("${data.content}")`
      );
      await expect(notification).toBeVisible();
      await expect(notification).toHaveText(`${data.content}`);
    } catch (e) {
      throw e.message;
    }
  }
}
