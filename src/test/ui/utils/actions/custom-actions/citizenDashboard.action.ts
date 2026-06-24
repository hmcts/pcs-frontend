import { Page, expect } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import { dashboard, viewTheResponse } from '../../../data/page-data';
import { viewAllApplications } from '../../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { pinUsers } from './fetchPINsAndValidateAccessCodeAPI.action';

export class CitizenDashboardAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      [
        'verifyRespondToClaimNotificationAndTag',
        () => this.verifyRespondToClaimNotificationAndTag(page, fieldName as actionRecord),
      ],
      [
        'verifyNavigationFromNotificationLink',
        () => this.verifyNavigationFromNotificationLink(page, fieldName as actionRecord),
      ],
      ['validateViewAllApplications', () => this.validateViewAllApplications()],
      ['verifyResponseOnViewTheClaimPage', () => this.verifyResponseOnViewTheClaimPage()],
    ]);

    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async verifyRespondToClaimNotificationAndTag(page: Page, notificationData: actionRecord) {
    const respondToClaimBeforeHearingParagraph = page.locator('p.govuk-body', {
      hasText: String(notificationData.notificationText),
    });
    await expect(respondToClaimBeforeHearingParagraph).toBeVisible();
    const isCompleted = String(notificationData.tag).toLowerCase() === 'completed';
    if (notificationData.responseLink) {
      const yourResponseLink = page.getByRole('link', {
        name: String(notificationData.responseLink),
      });

      //Verify Respond to claim link
      if (isCompleted) {
        // Verify link is deactivated (not rendered as a link)
        await expect(yourResponseLink).toHaveCount(0);
        // Verify text still exists
        await expect(page.getByText(String(notificationData.respondToTheClaimHeader), { exact: true })).toBeVisible();
      } else {
        // Verify active link
        await expect(yourResponseLink).toBeVisible();
      }
    }
    //Verify View response link
    const viewResponseLink = page.getByRole('link', {
      name: String(notificationData.viewResponseHeader),
    });
    if (isCompleted) {
      // Verify active link with tag
      await expect(viewResponseLink).toBeVisible();

      const vireResponseTask = page.locator('li.govuk-task-list__item').filter({
        hasText: String(notificationData.viewResponseHeader),
      });
      await expect(vireResponseTask.locator('.govuk-task-list__status')).toHaveText(
        String(notificationData.viewResponseTag)
      );
    } else {
      // Verify link is deactivated (not rendered as a link)
      await expect(viewResponseLink).toHaveCount(0);
      // Verify text still exists
      await expect(page.getByText(String(notificationData.viewResponseHeader), { exact: true })).toBeVisible();
    }

    const respondToClaimTask = page.locator('li.govuk-task-list__item').filter({
      hasText: String(notificationData.respondToTheClaimHeader),
    });
    await expect(respondToClaimTask.locator('.govuk-task-list__status')).toHaveText(String(notificationData.tag));
  }

  private async verifyNavigationFromNotificationLink(page: Page, notificationData: actionRecord) {
    const yourResponseLink = page.getByRole('link', {
      name: String(notificationData.responseLink),
    });
    await expect(yourResponseLink).toBeVisible();
    await yourResponseLink.click();
    await performValidation('mainHeader', notificationData.nextPageHeader);
    await page.goBack();
  }

  private async validateViewAllApplications(): Promise<void> {
    await performAction('clickLink', dashboard.viewAllApplicationsLink);
    await performValidation('mainHeader', viewAllApplications.mainHeader);
    await performValidation('text', { elementType: 'paragraph', text: viewAllApplications.getCaseNumber() });
    await performValidation('text', { elementType: 'subHeader', text: viewAllApplications.yourApplicationsSubHeader });
    const firstName = pinUsers[0]?.firstName;
    if (firstName === submitCaseApiData.submitCasePayload.defendant1.firstName) {
      await performValidation('text', {
        elementType: 'link',
        text: viewAllApplications.generalApplicationGA1Defendant1Link,
      });
    }
    if (firstName === submitCaseApiData.submitCasePayload.additionalDefendants?.[0]?.value?.firstName) {
      await performValidation('text', {
        elementType: 'link',
        text: viewAllApplications.generalApplicationGA1Defendant2Link,
      });
    }
    if (firstName === submitCaseApiData.submitCasePayload.additionalDefendants?.[1]?.value?.firstName) {
      await performValidation('text', {
        elementType: 'link',
        text: viewAllApplications.generalApplicationGA1Defendant3Link,
      });
    }
    await performValidation('text', {
      elementType: 'paragraph',
      text: 'Submitted on ' + viewAllApplications.getSubmittedDate(),
    });
  }

  private async verifyResponseOnViewTheClaimPage() {
    await performValidation('responseTable', viewTheResponse.claimantDetailsSubHeader, viewTheResponse.claimantDetails);
    await performValidation('responseTable', viewTheResponse.defendant1SubHeader, viewTheResponse.defendant1Details);
    await performValidation(
      'responseTable',
      viewTheResponse.additionalDefendant1DynamicSubHeader,
      viewTheResponse.additionalDefendant1Details
    );
    await performValidation(
      'responseTable',
      viewTheResponse.additionalDefendant2DynamicSubHeader,
      viewTheResponse.additionalDefendant2Details
    );
    await performValidation(
      'responseTable',
      viewTheResponse.responseToClaimSubHeader,
      viewTheResponse.responseToClaimDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.paymentsOrAgreementsSubHeader,
      viewTheResponse.paymentsOrAgreementsDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.yourHouseholdSubHeader,
      viewTheResponse.yourHouseholdDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.regularIncomeSubHeader,
      viewTheResponse.regularIncomeDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.priorityDebtsSubHeader,
      viewTheResponse.priorityDebtsDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.regularExpensesSubHeader,
      viewTheResponse.regularExpensesDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.additionalInformationSubHeader,
      viewTheResponse.additionalInformationDetails
    );
    await performValidation(
      'responseTable',
      viewTheResponse.counterclaimSubHeader,
      viewTheResponse.counterclaimDetails
    );
  }
}
