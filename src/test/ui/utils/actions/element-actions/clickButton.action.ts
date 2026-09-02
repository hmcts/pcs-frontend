import { Locator, Page } from '@playwright/test';

import { actionRetries, waitForPageRedirectionTimeout } from '../../../../../../playwright.config';
import { IAction } from '../../interfaces';

export class ClickButtonAction implements IAction {
  async execute(page: Page, action: string, buttonText: string, actionParams: string): Promise<void> {
    const i = Number(actionParams) || 0;
    const button = page
      .locator(
        `button:text-is("${buttonText}"),
                                  [value="${buttonText}"],
                                  :has-text("${buttonText}") + button,
                                  :has-text("${buttonText}") ~ button,
                                  a >> text=${buttonText}`
      )
      .nth(i);
    const actionsMap = new Map<string, () => Promise<void>>([
      ['clickButton', () => this.clickButton(page, button)],
      ['clickButtonAndVerifyPageNavigation', () => this.clickButtonAndVerifyPageNavigation(page, button, actionParams)],
      ['verifyPageAndClickButton', () => this.verifyPageAndClickButton(page, actionParams, button)],
      ['clickButtonAndWaitForElement', () => this.clickButtonAndWaitForElement(page, button, actionParams)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async clickButton(page: Page, button: Locator): Promise<void> {
    // `click()` auto-waits for actionability, so no pre-click sleep is needed.
    await button.click();
    // Kept as a cheap barrier: the app is server-rendered, so this lets a document
    // navigation triggered by the click reach `load` before the next action probes the DOM.
    await page.waitForLoadState();
  }

  private async clickButtonAndVerifyPageNavigation(
    page: Page,
    button: Locator,
    nextPageElement: string
  ): Promise<void> {
    const pageElement = page.locator(`h1:has-text("${nextPageElement}")`);
    let attempt = 0;
    let nextPageElementIsVisible: boolean;
    do {
      attempt++;
      await this.clickButton(page, button);
      // Wait for the next page rather than sleeping a fixed period: this returns as soon as the
      // heading appears but still allows the same per-attempt budget before retrying the click.
      // The retry loop is kept as a safety net for the app behaving abnormally.
      nextPageElementIsVisible = await pageElement
        .first()
        .waitFor({ state: 'visible', timeout: waitForPageRedirectionTimeout })
        .then(() => true)
        .catch(() => false);
    } while (!nextPageElementIsVisible && attempt < actionRetries);
    if (!nextPageElementIsVisible) {
      throw new Error(`Navigation to "${nextPageElement}" page/element failed after ${attempt} attempts`);
    }
  }

  private async clickButtonAndWaitForElement(page: Page, button: Locator, nextPageElement: string): Promise<void> {
    await this.clickButton(page, button);
    //Adding sleep to slow down execution when the application behaves abnormally
    await page.locator(`h1:has-text("${nextPageElement}")`).waitFor({ state: 'visible' });
  }

  private async verifyPageAndClickButton(page: Page, currentPageHeader: string, button: Locator): Promise<void> {
    // `textContent()` auto-waits for the heading, which is the readiness signal here.
    if ((await page.locator('h1,h1.govuk-heading-xl, h1.govuk-heading-l').textContent()) === currentPageHeader) {
      await this.clickButton(page, button);
    }
  }
}
