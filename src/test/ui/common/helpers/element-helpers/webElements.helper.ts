import {Locator, expect} from '@playwright/test';

export class webElementsHelper {
  async compareElementText(
    element: Locator,
    expected: string | RegExp,
    options: { exact?: boolean; trim?: boolean } = {}
  ) {
    const actual = await element.textContent();
    if (actual === null) throw new Error('Element not found');

    const text = options.trim !== false ? actual.trim() : actual;

    if (expected instanceof RegExp) {
      expect(text).toMatch(expected);
    } else if (options.exact === false) {
      expect(text).toContain(expected);
    } else {
      expect(text).toBe(expected);
    }
  }
}
