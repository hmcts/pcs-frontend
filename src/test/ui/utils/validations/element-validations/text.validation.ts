import { Page, expect } from '@playwright/test';

import { escapeForRegex } from '../../common/string.utils';
import { IValidation, validationRecord } from '../../interfaces';

export class TextValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationRecord): Promise<void> {
    switch (data.elementType) {
      case 'link':
        data.elementType = 'a';
        break;
      case 'paragraphLink':
        data.elementType = 'p > a';
        break;
      case 'heading':
        data.elementType = 'h1.govuk-heading-l';
        break;
      case 'paragraph':
        data.elementType = 'p';
        break;
      case 'inlineText':
        data.elementType = 'span';
        break;
      case 'listItem':
        data.elementType = 'li';
        break;
      case 'summaryText':
        data.elementType = '.govuk-details__text';
        break;
    }
    const locator = page.locator(`${data.elementType}:text-is("${data.text}")`).filter({ visible: true }).first();
    await expect(locator).toHaveText(new RegExp(`^${escapeForRegex(String(data.text))}$`));
  }
}
