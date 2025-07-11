import { Page, expect } from '@playwright/test';

import { IValidation, ValidationData } from '../../interfaces/validation.interface';

export class TextValidation implements IValidation {
  async validate(page: Page, fieldName: string, data: ValidationData): Promise<void> {
    const locator = page.locator(`[data-testid="${fieldName}"]`);

    if ('expected' in data) {
      await expect(locator).toHaveText(String(data.expected));
    } else {
      throw new Error('TextValidation requires "expected" property in data');
    }
  }
}
