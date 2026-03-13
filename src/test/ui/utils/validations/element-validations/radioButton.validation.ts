import { Page, expect } from '@playwright/test';

import { escapeForRegex } from '../../common/string.utils';
import { IValidation, validationData } from '../../interfaces';

export class RadioButtonValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName?: string, status?: validationData): Promise<void> {
    const radio = page.getByRole('radio', { name: new RegExp(`^${escapeForRegex(String(fieldName))}$`) });
    if (status) {
      await expect(radio).toBeChecked();
    } else {
      await expect(radio).not.toBeChecked();
    }
  }
}
