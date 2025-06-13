import { Page, expect } from '@playwright/test';

let _page: Page | null = null;

export async function initActionHelper(page: Page): Promise<void> {
  _page = page;
}

export async function performAction(action: 'verifyPageTitle', value: string): Promise<void>;

export async function performAction(
  action: 'fill' | 'click' | 'check',
  identifier: string,
  value?: string
): Promise<void>;

export async function performAction(action: string, identifierOrValue: string, value?: string): Promise<void> {
  if (!_page) {
    throw new Error('Call initActionHelper() with a page');
  }

  const actions = {
    fill: async (id: string, val: string): Promise<void> => {
      if (!val) {
        throw new Error('Fill requires value');
      }
      const locator = _page!
        .locator(
          `
        //*[@aria-label="${id}" or
         @name="${id}" or
         (label[contains(., "${id}")]/following::input[1])]
      `
        )
        .first();
      await locator.fill(val);
    },

    click: async (id: string): Promise<void> => {
      const locator = _page!
        .locator(
          `
        //*[contains(@class, 'button') and @value='${id}' or
         @aria-label="${id}" or
         @name="${id}" or
         (label[contains(., "${id}")]/following::button[1])]
      `
        )
        .first();
      await locator.click();
    },

    check: async (id: string): Promise<void> => {
      const locator = _page!
        .locator(
          `
        //input[@type="checkbox" and
         (@aria-label="${id}" or
          @name="${id}" or
          following::label[contains(., "${id}")])]
      `
        )
        .first();
      await locator.check();
    },

    verifyPageTitle: async (title: string): Promise<void> => {
      await expect(_page!).toHaveTitle(title);
    },
  };

  switch (action) {
    case 'verifyPageTitle':
      await actions[action](identifierOrValue); // Uses the first parameter as value
      break;
    case 'fill':
    case 'click':
    case 'check':
      await actions[action](identifierOrValue, value!);
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
