import { Page, expect } from '@playwright/test';

import { IValidation, validationData } from '../../interfaces';

export class InputTextValueValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationData): Promise<void> {
    const inputLocator = await this.getStringFieldLocator(page, fieldName);

    if (data !== undefined) {
      await expect(inputLocator).toHaveValue(String(data));
    } else {
      const value = await inputLocator.inputValue();
      if (!value?.trim()) {
        throw new Error(`Input value for "${fieldName}" is empty`);
      }
    }
  }

  private async getStringFieldLocator(page: Page, fieldParams: string) {
    const roleLocator = page.getByRole('textbox', { name: fieldParams, exact: true });
    return (await roleLocator.count()) > 0
      ? roleLocator
      : page.locator(`text-is("${fieldParams}") ~ input:visible:enabled,
                      label:text-is("${fieldParams}") ~ textarea,
                      label:text-is("${fieldParams}") + div input`);
  }
}
