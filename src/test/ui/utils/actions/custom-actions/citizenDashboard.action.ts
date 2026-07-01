import { Page, expect } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import { dashboard, viewTheResponse } from '../../../data/page-data';
import { viewAllApplications } from '../../../data/page-data/genApps-page-data';
import { viewTheClaim } from '../../../data/page-data/theClaim-page-data';
import { performAction, performValidation, performValidations } from '../../controller';
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
      ['verifyResponseDetailsOnViewTheResponsePage', () => this.verifyResponseDetailsOnViewTheResponsePage()],
      ['verifyClaimDetailsOnViewTheClaimPage', () => this.verifyClaimDetailsOnViewTheClaimPage()],
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

  private async verifyResponseDetailsOnViewTheResponsePage() {
    await performValidations(
      'View the response page validation',
      ['viewClaimOrResponseTable', viewTheResponse.claimantDetailsSubHeader, viewTheResponse.claimantDetails],
      // The line below will be commented until the bug HDPI-7360 gets fixed
      //['viewClaimOrResponseTable', viewTheResponse.defendant1SubHeader, viewTheResponse.defendant1Details],
      [
        'viewClaimOrResponseTable',
        viewTheResponse.additionalDefendant1DynamicSubHeader,
        viewTheResponse.additionalDefendant1Details,
      ],
      [
        'viewClaimOrResponseTable',
        viewTheResponse.additionalDefendant2DynamicSubHeader,
        viewTheResponse.additionalDefendant2Details,
      ],
      ['viewClaimOrResponseTable', viewTheResponse.responseToClaimSubHeader, viewTheResponse.responseToClaimDetails],
      [
        'viewClaimOrResponseTable',
        viewTheResponse.paymentsOrAgreementsSubHeader,
        viewTheResponse.paymentsOrAgreementsDetails,
      ],
      ['viewClaimOrResponseTable', viewTheResponse.yourHouseholdSubHeader, viewTheResponse.yourHouseholdDetails],
      ['viewClaimOrResponseTable', viewTheResponse.regularIncomeSubHeader, viewTheResponse.regularIncomeDetails],
      ['viewClaimOrResponseTable', viewTheResponse.priorityDebtsSubHeader, viewTheResponse.priorityDebtsDetails],
      ['viewClaimOrResponseTable', viewTheResponse.regularExpensesSubHeader, viewTheResponse.regularExpensesDetails],
      [
        'viewClaimOrResponseTable',
        viewTheResponse.additionalInformationSubHeader,
        viewTheResponse.additionalInformationDetails,
      ],
      ['viewClaimOrResponseTable', viewTheResponse.counterclaimSubHeader, viewTheResponse.counterclaimDetails]
    );
  }

  private async verifyClaimDetailsOnViewTheClaimPage(): Promise<void> {
    await performValidation('text', { elementType: 'paragraph', text: viewTheClaim.possessionClaimParagraph });
    await performValidations(
      'View the claim page validation',
      ['viewClaimOrResponseTable', viewTheClaim.claimantDetailsSubHeader, viewTheClaim.claimantDetails],
      ['viewClaimOrResponseTable', viewTheClaim.defendant1SubHeader, viewTheClaim.defendant1Details],
      [
        'viewClaimOrResponseTable',
        viewTheClaim.additionalDefendant1SubHeader,
        viewTheClaim.additionalDefendant1Details,
      ],
      [
        'viewClaimOrResponseTable',
        viewTheClaim.additionalDefendant2SubHeader,
        viewTheClaim.additionalDefendant2Details,
      ],
      ['viewClaimOrResponseTable', viewTheClaim.claimDetailsSubHeader, viewTheClaim.claimDetails],
      ['viewClaimOrResponseTable', viewTheClaim.rentArrearsSubHeader, viewTheClaim.rentArrearsDetails],
      ['viewClaimOrResponseTable', viewTheClaim.actionTakenSubHeader, viewTheClaim.actionTakenDetails],
      ['viewClaimOrResponseTable', viewTheClaim.noticeDetailsSubHeader, viewTheClaim.noticeDetails],
      ['viewClaimOrResponseTable', viewTheClaim.tenancyDetailsSubHeader, viewTheClaim.tenancyDetails],
      [
        'viewClaimOrResponseTable',
        viewTheClaim.claimantCircumstancesSubHeader,
        viewTheClaim.claimantCircumstancesDetails,
      ],
      [
        'viewClaimOrResponseTable',
        viewTheClaim.defendantCircumstancesSubHeader,
        viewTheClaim.defendantCircumstancesDetails,
      ],
      ['viewClaimOrResponseTable', viewTheClaim.underlesseeSubHeader, viewTheClaim.underlesseeDetails],
      ['viewClaimOrResponseTable', viewTheClaim.statementOfTruthSubHeader, viewTheClaim.statementOfTruthDetails]
    );
    await performValidation('text', { elementType: 'paragraph', text: viewTheClaim.statementOfTruthParagraph });
    await performValidation('text', { elementType: 'link', text: viewTheClaim.claimPDFLink });
    await performAction('clickButton', viewTheClaim.closeAndReturnButton);
  }
}
