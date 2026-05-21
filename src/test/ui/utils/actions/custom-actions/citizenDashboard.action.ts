//import { Page, expect as playwrightExpect } from '@playwright/test';
import { expect, Page } from '@playwright/test';
import {
  chooseAnApplication,
} from '../../../data/page-data/genApps-page-data';

import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class CitizenDashboardAction implements IAction {

  async execute(
    page: Page,
    action: string,
    fieldName: actionData | actionRecord,
  ): Promise<void> {

    const actionsMap = new Map<string, () => Promise<void>>([
      ['verifyRespondToClaimNotificationAndTag', () => this.verifyRespondToClaimNotificationAndTag(page, fieldName as actionRecord)],
      ['verifyNavigationFromNotificationLink', () => this.verifyNavigationFromNotificationLink(page, fieldName as actionRecord)],
    ]);

    const actionToPerform = actionsMap.get(action);

    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }

    await actionToPerform();
  }

  private async verifyRespondToClaimNotificationAndTag(page: Page, notificationData: actionRecord,) {
  const respondToClaimBeforeHearingParagraph = page.locator('p.govuk-body',{
    hasText: String(notificationData.notificationText),
});
  await expect(respondToClaimBeforeHearingParagraph).toBeVisible();
  const isCompleted = String(notificationData.tag).toLowerCase() === 'completed';
  if (notificationData.responseLink) {
  const yourResponseLink = page.getByRole('link', {
    name: String(notificationData.responseLink),
  });    
  if (isCompleted) {
    // Verify link is deactivated (not rendered as a link)
      await expect(yourResponseLink).toHaveCount(0);
      // Verify text still exists
      await expect(page.getByText(String(notificationData.respondToTheClaimHeader),
          { exact: true },),).toBeVisible();
    } else {
      // Verify active link
      await expect(yourResponseLink).toBeVisible();
    }
  }
  const respondToClaimTask = page.locator('li.govuk-task-list__item')
    .filter({
      hasText: String(notificationData.respondToTheClaimHeader),
    });
     await expect(respondToClaimTask.locator('.govuk-task-list__status')).toHaveText(String(notificationData.tag));
   
  }
  private async verifyNavigationFromNotificationLink(page: Page, notificationData: actionRecord,) {
  const yourResponseLink = page.getByRole('link', {
    name: String(notificationData.responseLink),
  });
     await expect(yourResponseLink).toBeVisible();
     await yourResponseLink.click();
     await performValidation('mainHeader', notificationData.nextPageHeader);
     await page.goBack();
  }

}