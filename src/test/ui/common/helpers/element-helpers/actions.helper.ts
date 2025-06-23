import { Page } from '@playwright/test';

class ActionHelper {
  private static currentPage: Page | null = null;

  static initialize(page: Page): void {
    ActionHelper.currentPage = page;
  }

  private static getActivePage(): Page {
    if (!ActionHelper.currentPage) {
      throw new Error('ActionHelper not initialized. Call initActionHelper(page) before using performAction()');
    }
    return ActionHelper.currentPage;
  }

  private static actions = {
    fill: async (identifier: string, value: string): Promise<void> => {
      await ActionHelper.getActivePage()
        .locator(
          `label:has-text("${identifier}") + input,
           label:has-text("${identifier}") ~ input,
           [aria-label="${identifier}"],
           [placeholder="${identifier}"]`
        )
        .first()
        .fill(value);
    },
    click: async (identifier: string): Promise<void> => {
      await ActionHelper.getActivePage()
        .locator(
          `button:has-text("${identifier}"),
           [value="${identifier}"],
           [aria-label="${identifier}"],
           [name="${identifier}"],
           label:has-text("${identifier}") + button,
           label:has-text("${identifier}") ~ button`
        )
        .first()
        .click();
    },
    check: async (identifier: string): Promise<void> => {
      await ActionHelper.getActivePage()
        .locator(
          `input[type="checkbox"][aria-label="${identifier}"],
           input[type="checkbox"][name="${identifier}"],
           label:has-text("${identifier}") input[type="checkbox"]`
        )
        .first()
        .check();
    },
  };

  static performAction(action: 'fill', identifier: string, value: string): Promise<void>;
  static performAction(action: 'click' | 'check', identifier: string): Promise<void>;

  static async performAction(action: string, ...args: string[]): Promise<void> {
    if (!(action in ActionHelper.actions)) {
      throw new Error(`Unknown action: ${action}`);
    }

    const actionFunction = ActionHelper.actions[action as keyof typeof ActionHelper.actions];
    switch (action) {
      case 'fill':
        await (actionFunction as (id: string, value: string) => Promise<void>)(args[0], args[1]);
        break;
      case 'click':
      case 'check':
        await (actionFunction as (id: string) => Promise<void>)(args[0]);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export const performAction = ActionHelper.performAction;
export const initActionHelper = ActionHelper.initialize;
