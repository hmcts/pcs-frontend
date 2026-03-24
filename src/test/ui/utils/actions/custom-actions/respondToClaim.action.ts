import { Page } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  disputeClaimInterstitial,
  freeLegalAdvice,
  landlordRegistered,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  paymentInterstitial,
  repaymentsMade,
  tenancyDateDetails,
  tenancyDateUnknown,
} from '../../../data/page-data';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';
export let claimantsName: string;
export class RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectLegalAdvice', () => this.selectLegalAdvice(fieldName)],
      ['inputDefendantDetails', () => this.inputDefendantDetails(fieldName as actionRecord)],
      ['inputErrorValidation', () => this.inputErrorValidation(fieldName as actionRecord)],
      ['enterDateOfBirthDetails', () => this.enterDateOfBirthDetails(fieldName as actionRecord)],
      ['confirmDefendantDetails', () => this.confirmDefendantDetails(fieldName as actionRecord)],
      ['selectCorrespondenceAddressKnown', () => this.selectCorrespondenceAddressKnown(fieldName as actionRecord)],
      ['selectCorrespondenceAddressUnKnown', () => this.selectCorrespondenceAddressUnKnown(fieldName as actionRecord)],
      ['selectContactByTelephone', () => this.selectContactByTelephone(fieldName as actionRecord)],
      ['selectContactByTextMessage', () => this.selectContactByTextMessage(fieldName as actionData)],
      ['selectTenancyStartDateKnown', () => this.selectTenancyStartDateKnown(fieldName as actionRecord)],
      ['selectNoticeDetails', () => this.selectNoticeDetails(fieldName as actionRecord)],
      ['enterNoticeDateKnown', () => this.enterNoticeDateKnown(fieldName as actionRecord)],
      ['enterNoticeDateUnknown', () => this.enterNoticeDateUnknown(fieldName as actionRecord)],
      ['readPaymentInterstitial', () => this.readPaymentInterstitial()],
      ['repaymentsMade', () => this.repaymentsMade(fieldName as actionRecord)],
      ['selectContactPreferenceEmailOrPost', () => this.selectContactPreferenceEmailOrPost(fieldName as actionRecord)],
      ['disputeClaimInterstitial', () => this.disputeClaimInterstitial(fieldName as actionData)],
      ['selectLandlordRegistered', () => this.selectLandlordRegistered(fieldName as actionData)],
      ['enterTenancyStartDetailsUnKnown', () => this.enterTenancyStartDetailsUnKnown(fieldName as actionRecord)],
      ['disputingOtherPartsOfTheClaim', () => this.disputingOtherPartsOfTheClaim(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectLegalAdvice(legalAdviceData: actionData) {
    await performAction('clickRadioButton', {
      question: freeLegalAdvice.haveYouHadAnyFreeLegalAdviceQuestion,
      option: legalAdviceData,
    });
    await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
  }

  private async inputDefendantDetails(defendantData: actionRecord) {
    await performAction('inputText', defendantNameCapture.firstNameTextLabel, defendantData.fName);
    await performAction('inputText', defendantNameCapture.lastNameTextLabel, defendantData.lName);
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  }

  private async enterDateOfBirthDetails(defendantData: actionRecord) {
    if (defendantData?.dobDay && defendantData?.dobMonth && defendantData?.dobYear) {
      await performActions(
        'Defendant Date of Birth Entry',
        ['inputText', dateOfBirth.dayTextLabel, defendantData.dobDay],
        ['inputText', dateOfBirth.monthTextLabel, defendantData.dobMonth],
        ['inputText', dateOfBirth.yearTextLabel, defendantData.dobYear]
      );
    }
    await performAction('clickButton', dateOfBirth.saveAndContinueButton);
  }

  private async confirmDefendantDetails(defendantData: actionRecord) {
    await performAction('clickRadioButton', {
      question: defendantData.question,
      option: defendantData.option,
    });
    if (defendantData.option === defendantNameConfirmation.noRadioOption) {
      await this.inputDefendantDetails(defendantData);
    } else {
      await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
    }
  }

  private async selectCorrespondenceAddressKnown(addressData: actionRecord) {
    await performAction('clickRadioButton', {
      question: correspondenceAddress.correspondenceAddressConfirmHintText,
      option: addressData.radioOption,
    });
    if (addressData.radioOption === correspondenceAddress.noRadioOption) {
      await this.selectCorrespondenceAddressUnKnown(addressData);
    } else {
      await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
    }
  }

  private async selectCorrespondenceAddressUnKnown(addressData: actionRecord) {
    if (addressData.addressIndex) {
      await performActions(
        'Find Address based on postcode',
        ['inputText', correspondenceAddress.enterUKPostcodeHiddenTextLabel, addressData.postcode],
        ['clickButton', correspondenceAddress.findAddressHiddenButton],
        ['select', correspondenceAddress.addressSelectHiddenLabel, addressData.addressIndex]
      );
    } else if (addressData.addressLine1) {
      await performActions(
        'Enter Address Manually',
        ['clickLink', correspondenceAddress.enterAddressManuallyHiddenLink],
        ['inputText', correspondenceAddress.addressLine1HiddenTextLabel, addressData.addressLine1],
        ['inputText', correspondenceAddress.townOrCityHiddenTextLabel, addressData.townOrCity],
        ['inputText', correspondenceAddress.postcodeHiddenTextLabel, addressData.postcode]
      );
    }
    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  }

  private async selectContactPreferenceEmailOrPost(contactPreferenceData: actionRecord) {
    await performAction('clickRadioButton', {
      question: contactPreferenceData.question,
      option: contactPreferenceData.radioOption,
    });
    if (contactPreferenceData.radioOption === contactPreferenceEmailOrPost.byEmailRadioOption) {
      await performAction(
        'inputText',
        contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
        contactPreferenceData.emailAddress
      );
    }
    await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  }

  private async selectContactByTelephone(contactByPhoneData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: contactPreferencesTelephone.areYouHappyToContactQuestion,
      option: contactByPhoneData.radioOption,
    });
    if (contactByPhoneData.radioOption === contactPreferencesTelephone.yesRadioOption) {
      process.env.CONTACT_PREFERENCES_TELEPHONE = 'YES';
      await performAction(
        'inputText',
        contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel,
        contactByPhoneData.phoneNumber
      );
    }
    await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  }

  private async selectContactByTextMessage(contactData: actionData): Promise<void> {
    await performAction('clickRadioButton', {
      question: contactPreferencesTextMessage.contactByTextMessageQuestion,
      option: contactData,
    });
    await performAction('clickButton', contactPreferencesTextMessage.saveAndContinueButton);
  }

  private async disputeClaimInterstitial(isClaimantNameCorrect: actionData) {
    if (isClaimantNameCorrect === 'YES') {
      claimantsName = submitCaseApiData.submitCasePayload.claimantName;
    } else {
      claimantsName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    }
    const mainHeader = disputeClaimInterstitial.getMainHeader(claimantsName);
    const whenTheyMadeParagraph = disputeClaimInterstitial.getWhenTheyMadeTheirClaimParagraph(claimantsName);
    await performValidation('text', { elementType: 'heading', text: mainHeader });
    await performValidation('text', { elementType: 'paragraph', text: whenTheyMadeParagraph });
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
  }

  private async selectLandlordRegistered(registeredData: actionData): Promise<void> {
    await performAction('clickRadioButton', {
      question: landlordRegistered.isYourLandlordRegisteredQuestion,
      option: registeredData,
    });
    await performAction('clickButton', landlordRegistered.saveAndContinueButton);
  }

  private async readPaymentInterstitial(): Promise<void> {
    await performAction('clickButton', paymentInterstitial.continueButton);
  }

  private async repaymentsMade(repaymentsData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: repaymentsMade.mainHeader,
      option: repaymentsData.repaymentOption,
    });

    if (repaymentsData.repaymentOption === repaymentsMade.yesRadioOption) {
      await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsData.repaymentInfo);
    }
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  }

  private async selectTenancyStartDateKnown(tenancyStartDateData: actionRecord): Promise<void> {
    const getDetailsGivenByParagraph = tenancyDateDetails.getDetailsGivenByParagraph(claimantsName);
    await performValidation('text', { elementType: 'paragraph', text: getDetailsGivenByParagraph });
    await performAction('clickRadioButton', {
      question: tenancyDateDetails.isTheTenancyLicenceOrOccupationContractQuestion,
      option: tenancyStartDateData.option,
    });
    if (tenancyStartDateData?.day && tenancyStartDateData?.month && tenancyStartDateData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', tenancyDateDetails.dayHiddenTextLabel, tenancyStartDateData.day],
        ['inputText', tenancyDateDetails.monthHiddenTextLabel, tenancyStartDateData.month],
        ['inputText', tenancyDateDetails.yearHiddenTextLabel, tenancyStartDateData.year]
      );
    }
    await performAction('clickButton', tenancyDateDetails.saveAndContinueButton);
  }

  private async selectNoticeDetails(noticeGivenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: confirmationOfNoticeGiven.getDidClaimantGiveYouQuestion(claimantsName),
      option: noticeGivenData.option,
    });
    await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  }

  private async enterNoticeDateKnown(noticeData: actionRecord): Promise<void> {
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenProvided.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenProvided.saveAndContinueButton);
  }

  private async enterNoticeDateUnknown(noticeData: actionRecord): Promise<void> {
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenProvided.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenNotProvided.saveAndContinueButton);
  }

  private async enterTenancyStartDetailsUnKnown(tenancyStartData: actionRecord) {
    const getDidNotProvideParagraph = tenancyDateUnknown.getDidNotProvideParagraph(claimantsName);
    await performValidation('text', { elementType: 'paragraph', text: getDidNotProvideParagraph });
    if (tenancyStartData?.tsDay && tenancyStartData?.tsMonth && tenancyStartData?.tsYear) {
      await performActions(
        'Enter Date',
        ['inputText', tenancyDateUnknown.dayTextLabel, tenancyStartData.tsDay],
        ['inputText', tenancyDateUnknown.monthTextLabel, tenancyStartData.tsMonth],
        ['inputText', tenancyDateUnknown.yearTextLabel, tenancyStartData.tsYear]
      );
    }
    await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  }

  private async disputingOtherPartsOfTheClaim(doYouWantToDisputeOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: nonRentArrearsDispute.doYouWantToDisputeQuestion,
      option: doYouWantToDisputeOption.disputeOption,
    });

    if (doYouWantToDisputeOption.disputeOption === 'Yes') {
      await performAction(
        'inputText',
        nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
        doYouWantToDisputeOption.disputeInfo
      );
    }
    await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  }

  // Below changes are temporary will be changed as part of HDPI-3596
  private async inputErrorValidation(validationArr: actionRecord) {
    if (!validationArr || validationArr.validationReq !== 'YES') {
      return;
    }
    if (!Array.isArray(validationArr.inputArray)) {
      return;
    }
    for (const item of validationArr.inputArray) {
      switch (validationArr.validationType) {
        case 'radioOptions':
          await performValidation(
            'inputError',
            !validationArr?.label ? validationArr.question : validationArr.label,
            item.errMessage
          );
          if (validationArr.option) {
            await performAction('clickRadioButton', { question: validationArr.question, option: validationArr.option });
          }
          break;
        case 'textField':
          await performValidation('inputError', item.label, item.errMessage);
          await performValidation('errorMessage', { header: validationArr.header, message: item.errMessage });
          break;
        case 'checkBox':
          await performAction('clickButton', validationArr.button);
          await performValidation(
            'inputError',
            !validationArr?.label ? validationArr.question : validationArr.label,
            item.errMessage
          );
          break;
        default:
          throw new Error(`Validation type :"${validationArr.validationType}" is not valid`);
      }
    }
  }
}
