import { Page, expect } from '@playwright/test';

import { IValidation, ValidationData } from '../../interfaces/validation.interface';

export class CssValidation implements IValidation {
  async validate(page: Page, fieldName: string, data: ValidationData): Promise<void> {
    const locator = page.locator(`[data-testid="${fieldName}"]`);

    if ('property' in data && 'value' in data) {
      await expect(locator).toHaveCSS(String(data.property), String(data.value));
    } else {
      throw new Error('CssValidation requires "property" and "value" properties in data');
    }
  }
}
