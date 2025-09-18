import { Page, expect } from '@playwright/test';

import { IValidation, validationData } from '../../interfaces/validation.interface';

export class VisibilityValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, _data: validationData): Promise<void> {
    const locator = page.locator(`label:has-text("${fieldName}")`);
    await expect(locator).toBeVisible();
  }
}
