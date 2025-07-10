import { Page, expect } from '@playwright/test';

import { IValidation, ValidationData } from '../../interfaces/validation.interface';

export class ContainsTextValidation implements IValidation {
  async validate(page: Page, fieldName: string, data: ValidationData): Promise<void> {
    const locator = page.locator('//*[@id="main-content"]/h1');

    await expect(locator).toContainText(String(data.text));
  }
}
