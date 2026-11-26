import { Page } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import { dashboard, getDefendantDetails, getStatementOfTruthDetails, viewTheResponse } from '../../../data/page-data';
import { viewAllApplications } from '../../../data/page-data/genApps-page-data';
import { viewTheClaim } from '../../../data/page-data/theClaim-page-data';
import { performAction, performValidation, performValidations } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import {
  getPinUsersInClaimOrder,
  getSelectedDefendantNumber,
  getSelectedPinUser,
  pinUsers,
} from './fetchPINsAndValidateAccessCodeAPI.action';
import { RELEASE_1_4_ENABLED, getLdFlag } from './launchDarkly.action';

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
      ['verifyResponseDetailsOnViewTheResponsePage', () => this.verifyResponseDetailsOnViewTheResponsePage(page)],
      ['verifyClaimDetailsOnViewTheClaimPage', () => this.verifyClaimDetailsOnViewTheClaimPage()],
    ]);

    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async verifyRespondToClaimNotificationAndTag(_page: Page, notificationData: actionRecord) {
    await performValidation('text', {
      elementType: 'paragraph',
      text: notificationData.notificationText,
    });
    const isCompleted = String(notificationData.tag).toLowerCase() === 'completed';
    if (notificationData.responseLink) {
      //Verify Respond to claim link
      if (isCompleted) {
        // Verify link is deactivated (not rendered as a link)
        await performValidation('textNotVisible', {
          elementType: 'link',
          text: notificationData.responseLink,
        });
        // Verify text still exists
        await performValidation('text', {
          elementType: 'inlineText',
          text: notificationData.respondToTheClaimHeader,
        });
      } else {
        // Verify active link
        await performValidation('text', {
          elementType: 'link',
          text: notificationData.responseLink,
        });
      }
    }
    //Verify View response link
    if (isCompleted) {
      // Verify active link with tag
      await performValidation('text', {
        elementType: 'link',
        text: notificationData.viewResponseHeader,
      });
      await performValidation('text', notificationData.viewResponseHeader, {
        elementType: 'taskListStatus',
        text: notificationData.viewResponseTag,
      });
    } else {
      // Verify link is deactivated (not rendered as a link)
      await performValidation('textNotVisible', {
        elementType: 'link',
        text: notificationData.viewResponseHeader,
      });
      // Verify text still exists
      await performValidation('text', {
        elementType: 'inlineText',
        text: notificationData.viewResponseHeader,
      });
    }

    await performValidation('text', notificationData.respondToTheClaimHeader, {
      elementType: 'taskListStatus',
      text: notificationData.tag,
    });
  }

  private async verifyNavigationFromNotificationLink(page: Page, notificationData: actionRecord) {
    await performAction('clickLink', notificationData.responseLink);
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

  private async verifyResponseDetailsOnViewTheResponsePage(_page: Page) {
    const selectedDefendant = getSelectedPinUser();
    if (!selectedDefendant) {
      throw new Error('No authenticated defendant PIN user is available for response validation');
    }
    const defendantName = `${selectedDefendant.firstName} ${selectedDefendant.lastName}`;
    const defendantNumber = getSelectedDefendantNumber();
    const defendantDetailsSubHeader = `Defendant ${defendantNumber} details`;
    await performValidation('text', {
      elementType: 'paragraph',
      text: `Property address: ${viewTheClaim.dateAndCaseDetails['Property address']}`,
    });
    await performValidation('text', {
      elementType: 'paragraph',
      text: `Case number: ${process.env.CASE_FID}`,
    });
    await performValidation('viewClaimHeaderDetails', '', {
      'Date issued': viewTheClaim.dateAndCaseDetails['Date issued'],
      'Date submitted': viewTheClaim.dateAndCaseDetails['Date submitted'],
    });
    await performValidation('text', {
      elementType: 'subHeader',
      text: defendantDetailsSubHeader,
    });
    await performValidation(
      'viewClaimOrResponseTable',
      defendantDetailsSubHeader,
      getDefendantDetails(selectedDefendant.firstName, selectedDefendant.lastName, selectedDefendant.address)
    );
    const release14Enabled = await getLdFlag(RELEASE_1_4_ENABLED);
    for (const defendant of pinUsers) {
      const otherDefendantName = `${defendant.firstName} ${defendant.lastName}`;
      if (otherDefendantName === defendantName) {
        continue;
      }
      await performValidation(release14Enabled ? 'textNotVisible' : 'text', {
        elementType: 'summaryListValue',
        text: otherDefendantName,
      });
    }
    await performValidations(
      'View the response page validation',
      ['viewClaimOrResponseTable', viewTheResponse.claimantDetailsSubHeader, viewTheResponse.claimantDetails],
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
      ['viewClaimOrResponseTable', viewTheResponse.counterclaimSubHeader, viewTheResponse.counterclaimDetails],
      ['viewClaimOrResponseTable', viewTheResponse.statementOfTruthSubHeader, getStatementOfTruthDetails(defendantName)]
    );
    await performAction('reloadPage');
    await performValidation('mainHeader', dashboard.viewTheResponseSubHeader);
    await performValidation('validatePdfDocument', '', { linkText: viewTheResponse.responsePDFLink });
    if (await getLdFlag(RELEASE_1_4_ENABLED)) {
      await performValidation('validatePdfDocument', '', { linkText: viewTheResponse.counterClaimPDFLink });
    } else {
      await performValidation('textNotVisible', {
        elementType: 'link',
        text: viewTheResponse.counterClaimPDFLink,
      });
    }
  }

  private async verifyClaimDetailsOnViewTheClaimPage(): Promise<void> {
    const defendants = getPinUsersInClaimOrder();
    const defendantDetails = defendants.map((defendant, index) => ({
      ...viewTheClaim[
        `defendant${index + 1}Details` as 'defendant1Details' | 'defendant2Details' | 'defendant3Details'
      ],
      Name: `${defendant.firstName} ${defendant.lastName}`,
    }));

    await performValidation('viewClaimHeaderDetails', '', viewTheClaim.dateAndCaseDetails);
    await performValidation('viewClaimHeaderDetails', '', {
      ...viewTheClaim.dateAndCaseDetails,
      'Case number': process.env.CASE_FID,
    });
    await performValidation('text', { elementType: 'paragraph', text: viewTheClaim.possessionClaimParagraph });
    await performValidations(
      'View the claim page validation',
      ['viewClaimOrResponseTable', viewTheClaim.claimantDetailsSubHeader, viewTheClaim.claimantDetails],
      ['viewClaimOrResponseTable', viewTheClaim.defendant1SubHeader, defendantDetails[0]],
      ['viewClaimOrResponseTable', viewTheClaim.defendant2SubHeader, defendantDetails[1]],
      ['viewClaimOrResponseTable', viewTheClaim.defendant3SubHeader, defendantDetails[2]],
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
    await performValidation('validatePdfDocument', '', {
      linkText: 'RentArrearsStatement - Claimant 1.pdf',
    });
    await performValidation('validatePdfDocument', '', {
      linkText: 'rentArrears - Claimant 1.pdf',
    });
    await performValidation('validatePdfDocument', '', {
      linkText: 'tenancyLicenceDocuments - Claimant 1.pdf',
    });
    await performValidation('text', { elementType: 'paragraph', text: viewTheClaim.statementOfTruthParagraph });
    await performValidation('text', { elementType: 'paragraph', text: viewTheClaim.statementOfTruthParagraph });
    await performValidation('text', { elementType: 'subHeader', text: viewTheClaim.downloadPDFSubHeader });
    await performValidation('validatePdfDocument', '', { linkText: viewTheClaim.claimPDFLink });
    await performValidation('text', { elementType: 'inlineText', text: viewTheClaim.ifYouCannotFindLink });
    await performValidation('text', {
      elementType: 'paragraphWithLink',
      text: viewTheClaim.allDocumentsUploadedParagraph,
    });
    await performValidation('text', { elementType: 'link', text: viewTheClaim.documentsPageLink });
    await performAction('clickButton', viewTheClaim.closeAndReturnButton);
  }
}
