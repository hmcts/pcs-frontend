import { Locator, Page, expect } from '@playwright/test';

class VerificationHelper {
  private static currentPage: Page | null = null;

  static initialize(page: Page): void {
    VerificationHelper.currentPage = page;
  }

  private static getActivePage(): Page {
    if (!VerificationHelper.currentPage) {
      throw new Error('ActionHelper not initialized. Call initActionHelper(page) before using performAction()');
    }
    return VerificationHelper.currentPage;
  }

  private static verifies = {
    verifyPageTitle: async (title: string): Promise<void> => {
      await expect(VerificationHelper.getActivePage()).toHaveTitle(title);
    },
    dashboardNotification: async (notificationTitle: string, notificationContent: string): Promise<void> => {
      const notification = VerificationHelper.getActivePage().locator(
        `
                    //h2[contains(.,"${notificationTitle}")]/../following-sibling::div[normalize-space(.)="${notificationContent}"]`
      );
      await notification.isVisible();
      await expect(notification).toHaveText(`${notificationContent}`);
    },
    taskListItem: async (verificationType: string, identifier: string, value: string = ''): Promise<void> => {
      let task: Locator;
      let taskStatus: Locator;
      let deadline: Locator;
      switch (verificationType) {
        case 'verify-text-link':
          task = VerificationHelper.getActivePage().locator(
            `//a[contains(@class, "govuk-link")][normalize-space(.)="${identifier}"]`
          );
          await expect(task).toBeVisible();
          await expect(task).toHaveText(identifier);
          break;
        case 'verify-text':
          task = VerificationHelper.getActivePage().locator(`//div[normalize-space(.)="${identifier}"]`).first();
          await expect(task).toBeVisible();
          await expect(task).toHaveText(identifier);
          break;
        case 'verify-status':
          task = VerificationHelper.getActivePage().locator(`//*[normalize-space(.)="${identifier}"]`);
          taskStatus = task.locator(`../following-sibling::div[contains(.,"${value}")]`);
          await expect(taskStatus).toBeVisible();
          await expect(taskStatus).toHaveText(value);
          break;
        case 'verify-deadline':
          task = VerificationHelper.getActivePage().locator(
            `//a[contains(@class, "govuk-link")][normalize-space(.)="${identifier}"]`
          );
          deadline = task.locator('//following-sibling::div');
          await expect(deadline).toBeVisible();
          await expect(deadline).toHaveText(value);
          break;
        default:
          throw new Error(`Unknown verificationType: ${verificationType}`);
      }
    },
  };

  static performVerification(verify: 'verifyPageTitle', value: string): Promise<void>;
  static performVerification(verify: 'dashboardNotification', identifier: string, value: string): Promise<void>;
  static performVerification(
    verify: 'taskListItem',
    verificationType: string,
    identifier: string,
    value: string
  ): Promise<void>;

  static async performVerification(verify: string, ...args: string[]): Promise<void> {
    if (!(verify in VerificationHelper.verifies)) {
      throw new Error(`Unknown action: ${verify}`);
    }

    const actionFunction = VerificationHelper.verifies[verify as keyof typeof VerificationHelper.verifies];
    switch (verify) {
      case 'verifyPageTitle':
        await (actionFunction as (title: string) => Promise<void>)(args[0]);
        break;
      case 'dashboardNotification':
        await (actionFunction as (identifier: string, value: string) => Promise<void>)(args[0], args[1]);
        break;
      case 'taskListItem': {
        await (actionFunction as (verificationType: string, identifier: string, value: string) => Promise<void>)(
          args[0],
          args[1],
          args[2]
        );
        break;
      }
      default:
        throw new Error(`Unknown verification: ${verify}`);
    }
  }
}

export const performVerification = VerificationHelper.performVerification;
export const initVerificationHelper = VerificationHelper.initialize;
