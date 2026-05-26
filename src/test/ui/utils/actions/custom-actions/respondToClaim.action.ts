import { Page } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import { submitCaseApiDataWales } from '../../../data/api-data/submitCaseWales.api.data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimAgainstWhom,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimOrderOtherThanSum,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  defendantDateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  disputeClaimInterstitial,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  exceptionalHardship,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  howMuchAffordToPay,
  incomeAndExpenses,
  installmentPayments,
  landlordLicensed,
  landlordRegistered,
  languageUsed,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  otherConsiderations,
  paymentInterstitial,
  priorityDebtDetails,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  tenancyDateDetails,
  tenancyDateUnknown,
  tenancyTypeDetails,
  uploadFiles,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  writtenTerms,
  yourCircumstances,
  yourHouseholdAndCircumstances,
} from '../../../data/page-data';
import { formatCurrency, formatTextToLowercaseSeparatedBySpace } from '../../common/string.utils';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { FieldsStore } from './recordAnsweredFields.action';

const rtcCyaMap = new Map<string, string>();
const rtcSectionAnswers = new Map<string, Map<string, string>>();
let activeRtcSection = '';
const rtcUploadedDocumentsQuestion = 'Documents you have uploaded';
const rtcNoDocumentsUploadedValue = 'No documents uploaded';

const rtcSectionByAction = new Map<string, string>([
  ['selectLegalAdvice', 'startNowAndDetails'],
  ['inputDefendantDetails', 'personalDetails'],
  ['enterDateOfBirthDetails', 'personalDetails'],
  ['confirmDefendantDetails', 'personalDetails'],
  ['selectCorrespondenceAddressKnown', 'personalDetails'],
  ['selectCorrespondenceAddressUnKnown', 'personalDetails'],
  ['selectContactPreferenceEmailOrPost', 'personalDetails'],
  ['selectContactByTelephone', 'personalDetails'],
  ['selectContactByTextMessage', 'personalDetails'],
  ['disputeClaimInterstitial', 'disputeAndTenancy'],
  ['selectLandlordRegistered', 'disputeAndTenancy'],
  ['selectLandlordLicensed', 'disputeAndTenancy'],
  ['selectWrittenTerms', 'disputeAndTenancy'],
  ['enterTenancyStartDetailsUnKnown', 'disputeAndTenancy'],
  ['selectTenancyStartDateKnown', 'disputeAndTenancy'],
  ['selectNoticeDetails', 'disputeAndTenancy'],
  ['enterNoticeDateKnown', 'disputeAndTenancy'],
  ['enterNoticeDateUnknown', 'disputeAndTenancy'],
  ['tenancyOrContractTypeDetails', 'disputeAndTenancy'],
  ['rentArrears', 'disputeAndTenancy'],
  ['disputingOtherPartsOfTheClaim', 'disputeAndTenancy'],
  ['selectCounterClaim', 'disputeAndTenancy'],
  ['selectWhatAreYouClaimingFor', 'disputeAndTenancy'],
  ['counterClaimSpecificSumOfMoney', 'disputeAndTenancy'],
  ['selectCounterClaimFee', 'disputeAndTenancy'],
  ['selectClaimAgainstWhom', 'disputeAndTenancy'],
  ['counterClaimAbout', 'disputeAndTenancy'],
  ['counterClaimOrderOtherThanSum', 'disputeAndTenancy'],
  ['repaymentsMade', 'payments'],
  ['repaymentsAgreed', 'payments'],
  ['installmentPayments', 'payments'],
  ['selectHowMuchAffordToPay', 'payments'],
  ['doYouHaveAnyDependantChildren', 'situationAndCircumstances'],
  ['doYouHaveAnyOtherDependants', 'situationAndCircumstances'],
  ['selectIfAnyOtherAdultsLiveInYourHouse', 'situationAndCircumstances'],
  ['selectAlternativeAccommodation', 'situationAndCircumstances'],
  ['yourCircumstances', 'situationAndCircumstances'],
  ['exceptionalHardship', 'situationAndCircumstances'],
  ['selectIncomeAndExpenses', 'incomeAndExpenditure'],
  ['selectWhatRegularIncomeDoYouReceive', 'incomeAndExpenditure'],
  ['selectUniversalCredit', 'incomeAndExpenditure'],
  ['selectPriorityDebts', 'incomeAndExpenditure'],
  ['enterPriorityDebtDetails', 'incomeAndExpenditure'],
  ['selectWhatOtherRegularExpensesDoYouHave', 'incomeAndExpenditure'],
  ['otherConsiderations', 'incomeAndExpenditure'],
  ['uploadFiles', 'uploadFiles'],
  ['languageUsed', 'checkYourAnswersAndSubmit'],
]);

export let claimantsName: string;
export class RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectLegalAdvice', () => this.selectLegalAdvice(fieldName as actionRecord)],
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
      ['repaymentsAgreed', () => this.repaymentsAgreed(fieldName as actionRecord)],
      ['selectLandlordRegistered', () => this.selectLandlordRegistered(fieldName as actionData)],
      ['selectWrittenTerms', () => this.selectWrittenTerms(fieldName as actionRecord)],
      ['enterTenancyStartDetailsUnKnown', () => this.enterTenancyStartDetailsUnKnown(fieldName as actionRecord)],
      ['disputingOtherPartsOfTheClaim', () => this.disputingOtherPartsOfTheClaim(fieldName as actionRecord)],
      [
        'counterClaimHaveYouAppliedForHelpWithFee',
        () => this.counterClaimHaveYouAppliedForHelpWithFee(fieldName as actionRecord),
      ],
      ['selectCounterClaim', () => this.selectCounterClaim(fieldName as actionRecord)],
      ['rentArrears', () => this.rentArrears(fieldName as actionRecord)],
      ['tenancyOrContractTypeDetails', () => this.tenancyOrContractTypeDetails(fieldName as actionRecord)],
      ['selectLandlordLicensed', () => this.selectLandlordLicensed(fieldName as actionRecord)],
      ['selectIncomeAndExpenses', () => this.selectIncomeAndExpenses(fieldName as actionRecord)],
      [
        'selectWhatRegularIncomeDoYouReceive',
        () => this.selectWhatRegularIncomeDoYouReceive(fieldName as actionRecord),
      ],
      ['selectCounterClaimFee', () => this.selectCounterClaimFee(fieldName as actionRecord)],
      ['yourCircumstances', () => this.yourCircumstances(fieldName as actionRecord)],
      ['exceptionalHardship', () => this.exceptionalHardship(fieldName as actionRecord)],
      [
        'selectWhatOtherRegularExpensesDoYouHave',
        () => this.selectWhatOtherRegularExpensesDoYouHave(fieldName as actionRecord),
      ],
      [
        'selectIfAnyOtherAdultsLiveInYourHouse',
        () => this.selectIfAnyOtherAdultsLiveInYourHouse(fieldName as actionRecord),
      ],
      ['selectAlternativeAccommodation', () => this.selectAlternativeAccommodation(fieldName as actionRecord)],
      ['installmentPayments', () => this.installmentPayments(fieldName as actionRecord)],
      ['selectHowMuchAffordToPay', () => this.selectHowMuchAffordToPay(fieldName as actionRecord)],
      ['readYourHouseholdAndCircumstances', () => this.readYourHouseholdAndCircumstances()],
      ['doYouHaveAnyDependantChildren', () => this.doYouHaveAnyDependantChildren(fieldName as actionRecord)],
      ['doYouHaveAnyOtherDependants', () => this.doYouHaveAnyOtherDependants(fieldName as actionRecord)],
      ['selectUniversalCredit', () => this.selectUniversalCredit(fieldName as actionRecord)],
      ['selectPriorityDebts', () => this.selectPriorityDebts(fieldName as actionRecord)],
      ['enterPriorityDebtDetails', () => this.enterPriorityDebtDetails(fieldName as actionRecord)],
      ['languageUsed', () => this.languageUsed(fieldName as actionRecord)],
      ['otherConsiderations', () => this.otherConsiderations(fieldName as actionRecord)],
      ['uploadFiles', () => this.uploadFiles(fieldName as actionRecord)],
      ['selectWhatAreYouClaimingFor', () => this.selectWhatAreYouClaimingFor(fieldName as actionRecord)],
      ['counterClaimSpecificSumOfMoney', () => this.counterClaimSpecificSumOfMoney(fieldName as actionRecord)],
      ['resetRTCAnswerStore', () => this.resetRTCAnswerStore()],
      ['retrieveCYATableDataRTC', () => this.retrieveCYATableDataRTC(page)],
      ['validateCYARTC', () => this.validateCYARTC()],
      ['validateRTCSectionCYA', () => this.validateRTCSectionCYA(fieldName as actionRecord)],
      ['selectClaimAgainstWhom', () => this.selectClaimAgainstWhom(fieldName as actionRecord)],
      ['counterClaimAbout', () => this.counterClaimAbout(fieldName as actionRecord)],
      ['counterClaimOrderOtherThanSum', () => this.counterClaimOrderOtherThanSum(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    activeRtcSection = rtcSectionByAction.get(action) ?? '';
    await actionToPerform();
  }

  private normalizeValueData(value: actionData): string {
    if (Array.isArray(value)) {
      return value.map(val => String(val)).join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private formatRtcCyaCurrency(value: actionData): string {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return String(value);
    }
    return `£${numericValue.toFixed(2)}`;
  }

  private formatRtcCyaFrequency(value: actionData): string {
    const normalizedFrequency = String(value).trim().toLowerCase();
    if (normalizedFrequency === 'week') {
      return 'weekly';
    }
    if (normalizedFrequency === 'month') {
      return 'monthly';
    }
    return normalizedFrequency;
  }

  private getRtcCyaQuestionLabel(question: string): string {
    return question.replace(/\s*\(Optional\)\s*$/, '').trim();
  }

  private getRtcCyaChoiceLabel(choice: actionData): string {
    return String(choice)
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
  }

  private buildRtcCyaAmountAndFrequencyValue(amount: actionData, frequency: actionData): string {
    return `${this.formatRtcCyaCurrency(amount)} ${this.formatRtcCyaFrequency(frequency)}`;
  }

  private normalizeRtcCyaComparisonPart(value: string): string {
    return value
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private areRtcCyaValuesEquivalent(expectedValue: string, actualValue: string): boolean {
    if (actualValue.includes(expectedValue)) {
      return true;
    }

    const normalizedExpectedValue = this.normalizeRtcCyaComparisonPart(expectedValue);
    const normalizedActualValue = this.normalizeRtcCyaComparisonPart(actualValue);

    if (normalizedActualValue.includes(normalizedExpectedValue)) {
      return true;
    }

    const expectedParts = expectedValue
      .split(',')
      .map(part => this.normalizeRtcCyaComparisonPart(part))
      .filter(Boolean);
    const actualParts = actualValue
      .split(',')
      .map(part => this.normalizeRtcCyaComparisonPart(part))
      .filter(Boolean);

    if (expectedParts.length <= 1 || expectedParts.length !== actualParts.length) {
      return false;
    }

    const normalizedExpected = [...expectedParts].sort();
    const normalizedActual = [...actualParts].sort();

    return normalizedExpected.every((part, index) => part === normalizedActual[index]);
  }

  private recordAnswer(key: string, value: actionData): void {
    const normalizedValue = this.normalizeValueData(value);
    FieldsStore.set(key, normalizedValue);
    if (!activeRtcSection) {
      return;
    }
    const sectionAnswers = rtcSectionAnswers.get(activeRtcSection) ?? new Map<string, string>();
    sectionAnswers.set(key, normalizedValue);
    rtcSectionAnswers.set(activeRtcSection, sectionAnswers);
  }

  private deleteAnswer(key: string): void {
    FieldsStore.delete(key);
    rtcSectionAnswers.forEach(sectionAnswers => sectionAnswers.delete(key));
  }

  private async resetRTCAnswerStore(): Promise<void> {
    FieldsStore.clear();
    rtcCyaMap.clear();
    rtcSectionAnswers.clear();
    activeRtcSection = '';
  }

  private async selectLegalAdvice(legalAdviceData: actionData) {
    this.recordAnswer(freeLegalAdvice.haveYouHadAnyFreeLegalAdviceQuestion, legalAdviceData);
    await performAction('clickRadioButton', {
      question: freeLegalAdvice.haveYouHadAnyFreeLegalAdviceQuestion,
      option: legalAdviceData,
    });
    await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
  }

  private async inputDefendantDetails(defendantData: actionRecord) {
    this.recordAnswer(defendantNameCapture.firstNameTextLabel, defendantData.fName);
    this.recordAnswer(defendantNameCapture.lastNameTextLabel, defendantData.lName);
    await performAction('inputText', defendantNameCapture.firstNameTextLabel, defendantData.fName);
    await performAction('inputText', defendantNameCapture.lastNameTextLabel, defendantData.lName);
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  }

  private async enterDateOfBirthDetails(defendantData: actionRecord) {
    if (defendantData?.dobDay && defendantData?.dobMonth && defendantData?.dobYear) {
      await performActions(
        'Defendant Date of Birth Entry',
        ['inputText', defendantDateOfBirth.dayTextLabel, defendantData.dobDay],
        ['inputText', defendantDateOfBirth.monthTextLabel, defendantData.dobMonth],
        ['inputText', defendantDateOfBirth.yearTextLabel, defendantData.dobYear]
      );
    }
    await performAction('clickButton', defendantDateOfBirth.saveAndContinueButton);
  }

  private async confirmDefendantDetails(defendantData: actionRecord) {
    this.recordAnswer(String(defendantData.question), String(defendantData.option));
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
    this.recordAnswer(correspondenceAddress.correspondenceAddressConfirmHintText(), addressData.radioOption);
    await performAction('clickRadioButton', {
      question: correspondenceAddress.correspondenceAddressConfirmHintText(),
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
      this.recordAnswer('Address line 1', addressData.addressLine1);
      this.recordAnswer('Town or city', addressData.townOrCity);
      this.recordAnswer('Postcode', addressData.postcode);
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
    if (Array.isArray(contactPreferenceData.options)) {
      this.recordAnswer(contactPreferenceData.question as string, contactPreferenceData.options);
      for (const option of contactPreferenceData.options) {
        await performAction('check', {
          question: contactPreferenceData.question,
          option,
        });
        if (option === contactPreferenceEmailOrPost.byEmailCheckbox && contactPreferenceData.emailAddress) {
          this.recordAnswer(
            contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
            contactPreferenceData.emailAddress
          );
          await performAction(
            'inputText',
            contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
            contactPreferenceData.emailAddress
          );
        }
      }
      if (!contactPreferenceData.options.includes(contactPreferenceEmailOrPost.byEmailCheckbox)) {
        this.deleteAnswer(contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel);
      }
    }
    // Handle single selection
    else if (contactPreferenceData.radioOption) {
      this.recordAnswer(contactPreferenceData.question as string, contactPreferenceData.radioOption);
      await performAction('check', {
        question: contactPreferenceData.question,
        option: contactPreferenceData.radioOption,
      });

      if (contactPreferenceData.radioOption === contactPreferenceEmailOrPost.byEmailCheckbox) {
        this.recordAnswer(
          contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
          contactPreferenceData.emailAddress
        );
        await performAction(
          'inputText',
          contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
          contactPreferenceData.emailAddress
        );
      } else {
        this.deleteAnswer(contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel);
      }
    }
    await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  }
  private async selectContactByTelephone(contactByPhoneData: actionRecord): Promise<void> {
    this.recordAnswer(contactPreferencesTelephone.areYouHappyToContactQuestion, contactByPhoneData.radioOption);
    await performAction('clickRadioButton', {
      question: contactPreferencesTelephone.areYouHappyToContactQuestion,
      option: contactByPhoneData.radioOption,
    });
    if (contactByPhoneData.radioOption === contactPreferencesTelephone.yesRadioOption) {
      process.env.CONTACT_PREFERENCES_TELEPHONE = 'YES';
      this.recordAnswer(contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel, contactByPhoneData.phoneNumber);
      await performAction(
        'inputText',
        contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel,
        contactByPhoneData.phoneNumber
      );
    } else {
      this.deleteAnswer(contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel);
    }
    await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  }

  private async selectContactByTextMessage(contactData: actionData): Promise<void> {
    this.recordAnswer(contactPreferencesTextMessage.contactByTextMessageQuestion, contactData);
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
    await performValidation('text', { elementType: 'heading', text: mainHeader });
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
  }

  private async selectLandlordRegistered(registeredData: actionData): Promise<void> {
    this.recordAnswer(landlordRegistered.isYourLandlordRegisteredQuestion, registeredData);
    await performAction('clickRadioButton', {
      question: landlordRegistered.isYourLandlordRegisteredQuestion,
      option: registeredData,
    });
    await performAction('clickButton', landlordRegistered.saveAndContinueButton);
  }

  private async selectLandlordLicensed(licensedLandlordData: actionRecord): Promise<void> {
    this.recordAnswer(String(licensedLandlordData.question), licensedLandlordData.radioOption);
    await performAction('clickRadioButton', {
      question: licensedLandlordData.question,
      option: licensedLandlordData.radioOption,
    });
    await performAction('clickButton', landlordLicensed.saveAndContinueButton);
  }

  private async selectWrittenTerms(writtenTermsData: actionRecord): Promise<void> {
    this.recordAnswer(String(writtenTermsData.question), writtenTermsData.radioOption);
    await performAction('clickRadioButton', {
      question: writtenTermsData.question,
      option: writtenTermsData.radioOption,
    });
    await performAction('clickButton', writtenTerms.saveAndContinueButton);
  }

  private async readPaymentInterstitial(): Promise<void> {
    await performAction('clickButton', paymentInterstitial.continueButton);
  }
  private async repaymentsMade(repaymentsData: actionRecord): Promise<void> {
    this.recordAnswer(String(repaymentsData.question), repaymentsData.repaymentOption);
    await performAction('clickRadioButton', {
      question: repaymentsData.question,
      option: repaymentsData.repaymentOption,
    });
    if (repaymentsData.repaymentOption === repaymentsMade.yesRadioOption) {
      this.recordAnswer(repaymentsMade.giveDetailsHiddenTextLabel, repaymentsData.repaymentInfo);
      await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsData.repaymentInfo);
    } else {
      this.deleteAnswer(repaymentsMade.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  }

  private async repaymentsAgreed(repaymentsAgreedData: actionRecord): Promise<void> {
    this.recordAnswer(String(repaymentsAgreedData.question), repaymentsAgreedData.repaymentAgreedOption);
    await performAction('clickRadioButton', {
      question: repaymentsAgreedData.question,
      option: repaymentsAgreedData.repaymentAgreedOption,
    });
    if (repaymentsAgreedData.repaymentAgreedOption === repaymentsAgreed.yesRadioOption) {
      this.recordAnswer(repaymentsAgreed.giveDetailsHiddenTextLabel, repaymentsAgreedData.repaymentAgreedInfo);
      await performAction(
        'inputText',
        repaymentsAgreed.giveDetailsHiddenTextLabel,
        repaymentsAgreedData.repaymentAgreedInfo
      );
    } else {
      this.deleteAnswer(repaymentsAgreed.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  }
  private async installmentPayments(installmentData: actionRecord): Promise<void> {
    this.recordAnswer(String(installmentData.question), installmentData.radioOption);
    await performAction('clickRadioButton', {
      question: installmentData.question,
      option: installmentData.radioOption,
    });
    await performAction('clickButton', installmentPayments.saveAndContinueButton);
  }

  private async selectHowMuchAffordToPay(howMuchToPayData: actionRecord): Promise<void> {
    this.recordAnswer(howMuchAffordToPay.howMuchCouldYouAffordToPayTextLabel, howMuchToPayData.affordToPay);
    this.recordAnswer(String(howMuchToPayData.question), howMuchToPayData.radioOption);
    await performAction(
      'inputText',
      howMuchAffordToPay.howMuchCouldYouAffordToPayTextLabel,
      howMuchToPayData.affordToPay
    );
    await performAction('clickRadioButton', {
      question: howMuchToPayData.question,
      option: howMuchToPayData.radioOption,
    });
    await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  }

  private async selectCounterClaim(counterClaimOption: actionRecord): Promise<void> {
    this.recordAnswer(counterClaim.doYouWantToMakeACounterclaim, counterClaimOption.option);
    await performAction('clickRadioButton', {
      question: counterClaim.doYouWantToMakeACounterclaim,
      option: counterClaimOption.option,
    });

    process.env.SELECT_COUNTER_CLAIM = String(counterClaimOption.option).toUpperCase();
    await performAction('clickButton', counterClaim.saveAndContinueButton);
  }

  private async selectIncomeAndExpenses(incomeAndExpenseData: actionRecord): Promise<void> {
    this.recordAnswer(incomeAndExpenses.doYouWantToProvideDetailsHeader, incomeAndExpenseData.incomeAndExpensesOption);
    await performAction('clickRadioButton', {
      question: incomeAndExpenses.doYouWantToProvideDetailsHeader,
      option: incomeAndExpenseData.incomeAndExpensesOption,
    });
    await performAction('clickButton', incomeAndExpenses.saveAndContinueButton);
  }

  private async selectWhatRegularIncomeDoYouReceive(regularIncome?: actionRecord): Promise<void> {
    if (!Array.isArray(regularIncome?.regularIncomeOptions)) {
      this.deleteAnswer(this.getRtcCyaQuestionLabel(whatRegularIncomeDoYouReceive.mainHeader));
      await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
      return;
    }

    const selectedRegularIncomeValues: string[] = [];

    for (const income of regularIncome.regularIncomeOptions) {
      const [option, value, frequency] = income;

      await performAction('check', {
        question: whatRegularIncomeDoYouReceive.mainHeader,
        option,
      });

      if (option === whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph) {
        await performAction(
          'inputText',
          whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
          value
        );
        selectedRegularIncomeValues.push(`${this.getRtcCyaChoiceLabel(option)}: ${String(value)}`);
        continue;
      }

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatRegularIncomeDoYouReceive.totalAmountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);

      selectedRegularIncomeValues.push(
        `${this.getRtcCyaChoiceLabel(option)}: ${this.buildRtcCyaAmountAndFrequencyValue(value, frequency)}`
      );
    }

    if (selectedRegularIncomeValues.length > 0) {
      this.recordAnswer(
        this.getRtcCyaQuestionLabel(whatRegularIncomeDoYouReceive.mainHeader),
        selectedRegularIncomeValues.join(', ')
      );
    } else {
      this.deleteAnswer(this.getRtcCyaQuestionLabel(whatRegularIncomeDoYouReceive.mainHeader));
    }

    await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  }

  private async selectTenancyStartDateKnown(tenancyStartDateData: actionRecord): Promise<void> {
    const getDetailsGivenByParagraph = tenancyDateDetails.getDetailsGivenByParagraph(claimantsName);
    await performValidation('text', { elementType: 'paragraph', text: getDetailsGivenByParagraph });
    this.recordAnswer(tenancyDateDetails.isTheTenancyLicenceOrOccupationContractQuestion, tenancyStartDateData.option);
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
    this.recordAnswer(confirmationOfNoticeGiven.getDidClaimantGiveYouQuestion(claimantsName), noticeGivenData.option);
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
        ['inputText', noticeDateWhenNotProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenNotProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenNotProvided.yearTextLabel, noticeData.year]
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

  private async selectIfAnyOtherAdultsLiveInYourHouse(adultsInHouseDetails: actionRecord) {
    this.recordAnswer(doAnyOtherAdultsLiveInYourHome.mainHeader, adultsInHouseDetails.radioOption);
    await performAction('clickRadioButton', {
      question: doAnyOtherAdultsLiveInYourHome.mainHeader,
      option: adultsInHouseDetails.radioOption,
    });

    if (adultsInHouseDetails.radioOption === 'Yes' && adultsInHouseDetails.details) {
      this.recordAnswer(
        doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel,
        adultsInHouseDetails.details
      );
      await performAction(
        'inputText',
        doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel,
        adultsInHouseDetails.details
      );
    } else {
      this.deleteAnswer(doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel);
    }
    await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  }

  private async selectAlternativeAccommodation(moveInDetails: actionRecord) {
    this.recordAnswer(wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.mainHeader, moveInDetails.radioOption);
    await performAction('clickRadioButton', {
      question: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.mainHeader,
      option: moveInDetails.radioOption,
    });

    if (moveInDetails.radioOption === 'Yes' && moveInDetails?.day && moveInDetails?.month && moveInDetails?.year) {
      await performActions(
        'Enter Date',
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.dayHiddenTextLabel, moveInDetails.day],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthHiddenTextLabel, moveInDetails.month],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearHiddenTextLabel, moveInDetails.year]
      );
    }
    await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  }

  private async disputingOtherPartsOfTheClaim(doYouWantToDisputeOption: actionRecord): Promise<void> {
    this.recordAnswer(nonRentArrearsDispute.doYouWantToDisputeQuestion, doYouWantToDisputeOption.disputeOption);
    await performAction('clickRadioButton', {
      question: nonRentArrearsDispute.doYouWantToDisputeQuestion,
      option: doYouWantToDisputeOption.disputeOption,
    });

    if (doYouWantToDisputeOption.disputeOption === 'Yes') {
      this.recordAnswer(nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel, doYouWantToDisputeOption.disputeInfo);
      await performAction(
        'inputText',
        nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
        doYouWantToDisputeOption.disputeInfo
      );
    } else {
      this.deleteAnswer(nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel);
    }
    await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  }

  private async counterClaimHaveYouAppliedForHelpWithFee(helpWithFee: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: counterClaimHaveYouAppliedForHelp.haveYouAlreadyAppliedForHelpWithYourCounterclaimFeeQuestion,
      option: helpWithFee.helpWithFeeOption,
    });

    if (helpWithFee.helpWithFeeOption === 'Yes') {
      await performAction(
        'inputText',
        counterClaimHaveYouAppliedForHelp.enterHelpWithFeeReferenceHiddenTextLabel,
        helpWithFee.feeReference
      );
    }
    await performAction('clickButton', counterClaimHaveYouAppliedForHelp.saveAndContinueButton);
  }

  private async rentArrears(rentArrearsInfo: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'subHeader',
      text: `Amount you owe in rent arrears given by ${claimantsName}:`,
    });
    await performValidation('text', {
      elementType: 'paragraph',
      text: `When they made their claim, ${claimantsName} had to provide a copy of the rent statement for your property, showing the total rent arrears you owe.`,
    });
    const rentArrearsAmount = formatCurrency(`${submitCaseApiData.submitCasePayload.rentArrears_Total}`);
    await performValidation('text', {
      elementType: 'paragraph',
      text: `${rentArrearsAmount}`,
    });
    this.recordAnswer(rentArrears.doYouOweThisQuestion, rentArrearsInfo.option);
    await performAction('clickRadioButton', {
      question: rentArrears.doYouOweThisQuestion,
      option: rentArrearsInfo.option,
    });
    if (rentArrearsInfo.option === 'No') {
      this.recordAnswer(rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrearsInfo.rentAmount);
      await performAction('inputText', rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrearsInfo.rentAmount);
    } else {
      this.deleteAnswer(rentArrears.howMuchDoYouBelieveHiddenTextLabel);
    }
    await performAction('clickButton', rentArrears.saveAndContinueButton);
  }

  private async tenancyOrContractTypeDetails(tenancyTypeDetailsInfo: actionRecord) {
    const tenancyType = formatTextToLowercaseSeparatedBySpace(tenancyTypeDetailsInfo.tenancyType as string);
    const article = /^[aeiou]/i.test(tenancyType) ? 'an' : 'a';
    if (process.env.WALES_POSTCODE === 'YES') {
      if (tenancyType === 'secure contract') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The property is let under a secure occupation contract`,
        });
      } else if (tenancyType === 'standard contract') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The property is let under a standard occupation contract`,
        });
      } else if (tenancyType === 'other') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The claimant provided the following information about your tenancy, occupation contract or licence agreement type: ${submitCaseApiDataWales.submitCaseRentOtherTenancy.otherLicenceTypeDetails}`,
        });
      }
    } else {
      if (
        tenancyType === 'assured tenancy' ||
        tenancyType === 'introductory tenancy' ||
        tenancyType === 'secure tenancy' ||
        tenancyType === 'flexible tenancy' ||
        tenancyType === 'demoted tenancy'
      ) {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The property is let under ${article} ${tenancyType} agreement`,
        });
      } else if (tenancyType === 'other') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The claimant provided the following information about your tenancy, occupation contract or licence agreement type: ${submitCaseApiData.submitCasePayloadOtherTenancy.tenancy_DetailsOfOtherTypeOfTenancyLicence}`,
        });
      }
    }
    this.recordAnswer(tenancyTypeDetails.isTenancyTypeCorrectQuestion, tenancyTypeDetailsInfo.tenancyOption);
    await performAction('clickRadioButton', {
      question: tenancyTypeDetails.isTenancyTypeCorrectQuestion,
      option: tenancyTypeDetailsInfo.tenancyOption,
    });
    if (tenancyTypeDetailsInfo.tenancyOption === 'No' && tenancyTypeDetailsInfo.tenancyTypeInfo) {
      this.recordAnswer(
        tenancyTypeDetails.giveCorrectTenancyTypeHiddenTextLabel,
        tenancyTypeDetailsInfo.tenancyTypeInfo
      );
      await performAction(
        'inputText',
        tenancyTypeDetails.giveCorrectTenancyTypeHiddenTextLabel,
        tenancyTypeDetailsInfo.tenancyTypeInfo
      );
    } else {
      this.deleteAnswer(tenancyTypeDetails.giveCorrectTenancyTypeHiddenTextLabel);
    }
    await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  }

  private async yourCircumstances(yourCircumstancesData: actionRecord): Promise<void> {
    this.recordAnswer(String(yourCircumstancesData.question), yourCircumstancesData.yourCircumstancesOption);
    await performAction('clickRadioButton', {
      question: yourCircumstancesData.question,
      option: yourCircumstancesData.yourCircumstancesOption,
    });
    if (yourCircumstancesData.yourCircumstancesOption === yourCircumstances.yesRadioOption) {
      this.recordAnswer(yourCircumstances.giveDetailsHiddenTextLabel, yourCircumstances.detailsTextInput);
      await performAction(
        'inputText',
        yourCircumstances.giveDetailsHiddenTextLabel,
        yourCircumstances.detailsTextInput
      );
    } else {
      this.deleteAnswer(yourCircumstances.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  }

  private async selectCounterClaimFee(counterClaimFeeOption: actionRecord) {
    let counterClaimFeeValue: number | string = 0;
    if (counterClaimFeeOption.typeOfClaim === 'Something else') {
      counterClaimFeeValue = 377;
    } else if (
      counterClaimFeeOption.typeOfClaim === 'A sum of money or compensation' ||
      counterClaimFeeOption.typeOfClaim === 'Both'
    ) {
      if (counterClaimFeeOption.amount === null) {
        throw new Error('Amount is required for this type of claim');
      }
      const amount = Number(counterClaimFeeOption.amount);
      if (amount <= 300) {
        counterClaimFeeValue = 35; // FEE0514
      } else if (amount <= 500) {
        counterClaimFeeValue = 50; // FEE0513
      } else if (amount <= 1000) {
        counterClaimFeeValue = 70; // FEE0512
      } else if (amount <= 1500) {
        counterClaimFeeValue = 80; // FEE0511
      } else if (amount <= 3000) {
        counterClaimFeeValue = 115; // FEE0510
      } else if (amount <= 5000) {
        counterClaimFeeValue = 205; // FEE0509
      } else if (amount <= 10000) {
        counterClaimFeeValue = 455; // FEE0508
      } else if (amount <= 200000) {
        counterClaimFeeValue = Number((amount * 0.05).toFixed(2)); // FEE0507
      } else {
        counterClaimFeeValue = 10000; // FEE0506
      }
    }
    const basedOnInformationParagraph = `Based on the information provided, it will cost £${counterClaimFeeValue} to make your counterclaim.`;
    await performValidation('text', { elementType: 'paragraph', text: basedOnInformationParagraph });

    this.recordAnswer(counterClaimFee.doYouNeedHelpPayingCounterClaimQuestion, counterClaimFeeOption.radioOption);
    await performAction('clickRadioButton', {
      question: counterClaimFee.doYouNeedHelpPayingCounterClaimQuestion,
      option: counterClaimFeeOption.radioOption,
    });
    await performAction('clickButton', counterClaimFee.saveAndContinueButton);
  }

  private async exceptionalHardship(exceptionalHardshipData: actionRecord): Promise<void> {
    this.recordAnswer(String(exceptionalHardshipData.question), exceptionalHardshipData.exceptionalHardshipOption);
    await performAction('clickRadioButton', {
      question: exceptionalHardshipData.question,
      option: exceptionalHardshipData.exceptionalHardshipOption,
    });
    if (exceptionalHardshipData.exceptionalHardshipOption === exceptionalHardship.yesRadioOption) {
      this.recordAnswer(exceptionalHardship.giveDetailsHiddenTextLabel, exceptionalHardship.detailsTextInput);
      await performAction(
        'inputText',
        exceptionalHardship.giveDetailsHiddenTextLabel,
        exceptionalHardship.detailsTextInput
      );
    } else {
      this.deleteAnswer(exceptionalHardship.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  }

  private async readYourHouseholdAndCircumstances(): Promise<void> {
    await performAction('clickButton', yourHouseholdAndCircumstances.continueButton);
  }

  private async doYouHaveAnyOtherDependants(otherDependantsData: actionRecord): Promise<void> {
    this.recordAnswer(doYouHaveAnyOtherDependants.mainHeader, otherDependantsData.otherDependantsOption);
    await performAction('clickRadioButton', {
      question: doYouHaveAnyOtherDependants.mainHeader,
      option: otherDependantsData.otherDependantsOption,
    });

    if (otherDependantsData.otherDependantsOption === doYouHaveAnyOtherDependants.yesRadioOption) {
      this.recordAnswer(
        doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel,
        otherDependantsData.otherDependantsInfo
      );
      await performAction(
        'inputText',
        doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel,
        otherDependantsData.otherDependantsInfo
      );
    } else {
      this.deleteAnswer(doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', doYouHaveAnyOtherDependants.saveAndContinueButton);
  }

  private async doYouHaveAnyDependantChildren(dependantChildrenData: actionRecord): Promise<void> {
    this.recordAnswer(doYouHaveAnyDependantChildren.mainHeader, dependantChildrenData.dependantChildrenOption);
    await performAction('clickRadioButton', {
      question: doYouHaveAnyDependantChildren.mainHeader,
      option: dependantChildrenData.dependantChildrenOption,
    });

    if (dependantChildrenData.dependantChildrenOption === doYouHaveAnyDependantChildren.yesRadioOption) {
      this.recordAnswer(
        doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel,
        dependantChildrenData.dependantChildrenInfo
      );
      await performAction(
        'inputText',
        doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel,
        dependantChildrenData.dependantChildrenInfo
      );
    } else {
      this.deleteAnswer(doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  }

  private async selectUniversalCredit(universalCreditDateData: actionRecord): Promise<void> {
    this.recordAnswer(haveYouAppliedForUniversalCredit.mainHeader, universalCreditDateData.creditRadioOption);
    await performAction('clickRadioButton', {
      question: haveYouAppliedForUniversalCredit.mainHeader,
      option: universalCreditDateData.creditRadioOption,
    });
    if (
      universalCreditDateData.creditRadioOption === 'Yes' &&
      universalCreditDateData?.day &&
      universalCreditDateData?.month &&
      universalCreditDateData?.year
    ) {
      await performActions(
        'Enter Date',
        ['inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, universalCreditDateData.day],
        ['inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, universalCreditDateData.month],
        ['inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, universalCreditDateData.year]
      );
    }
    await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  }

  private async selectPriorityDebts(priorityDebtsData: actionRecord): Promise<void> {
    this.recordAnswer(priorityDebts.doYouHaveAnyPriorityDebtsQuestion, priorityDebtsData.option);
    await performAction('clickRadioButton', {
      question: priorityDebts.doYouHaveAnyPriorityDebtsQuestion,
      option: priorityDebtsData.option,
    });
    await performAction('clickButton', priorityDebts.saveAndContinueButton);
  }

  private async enterPriorityDebtDetails(priorityDebtDetailsData: actionRecord): Promise<void> {
    this.recordAnswer(
      priorityDebtDetails.whatIsTheTotalAmountQuestion,
      this.formatRtcCyaCurrency(priorityDebtDetailsData.totalAmount)
    );
    this.recordAnswer(
      priorityDebtDetails.howMuchDoYouPayQuestion,
      this.buildRtcCyaAmountAndFrequencyValue(priorityDebtDetailsData.payAmount, priorityDebtDetailsData.option)
    );
    this.deleteAnswer(priorityDebtDetails.paidEveryParagraph);
    await performAction(
      'inputText',
      priorityDebtDetails.whatIsTheTotalAmountQuestion,
      priorityDebtDetailsData.totalAmount
    );
    await performAction('inputText', priorityDebtDetails.howMuchDoYouPayQuestion, priorityDebtDetailsData.payAmount);
    await performAction('clickRadioButton', {
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetailsData.option,
    });
    await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  }
  private async selectWhatOtherRegularExpensesDoYouHave(regularIncome?: actionRecord): Promise<void> {
    if (!Array.isArray(regularIncome?.regularIncomeOptions)) {
      this.deleteAnswer(this.getRtcCyaQuestionLabel(whatOtherRegularExpensesDoYouHave.mainHeader));
      await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
      return;
    }

    const selectedRegularExpenseValues: string[] = [];

    for (const income of regularIncome.regularIncomeOptions) {
      const [option, value, frequency] = income;

      await performAction('check', {
        question: whatOtherRegularExpensesDoYouHave.mainHeader,
        option,
      });

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatOtherRegularExpensesDoYouHave.amountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);

      selectedRegularExpenseValues.push(
        `${this.getRtcCyaChoiceLabel(option)}: ${this.buildRtcCyaAmountAndFrequencyValue(value, frequency)}`
      );
    }

    if (selectedRegularExpenseValues.length > 0) {
      this.recordAnswer(
        this.getRtcCyaQuestionLabel(whatOtherRegularExpensesDoYouHave.mainHeader),
        selectedRegularExpenseValues.join(', ')
      );
    } else {
      this.deleteAnswer(this.getRtcCyaQuestionLabel(whatOtherRegularExpensesDoYouHave.mainHeader));
    }

    await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  }

  private async languageUsed(languageScreenData: actionRecord): Promise<void> {
    this.recordAnswer(String(languageScreenData.question), languageScreenData.radioOption);
    await performAction('clickRadioButton', {
      question: languageScreenData.question,
      option: languageScreenData.radioOption,
    });
    await performAction('clickButton', languageUsed.saveAndContinueButton);
  }

  private async otherConsiderations(otherConsiderationsData: actionRecord): Promise<void> {
    this.recordAnswer(String(otherConsiderationsData.question), otherConsiderationsData.option);
    await performAction('clickRadioButton', {
      question: otherConsiderationsData.question,
      option: otherConsiderationsData.option,
    });
    if (otherConsiderationsData.option === otherConsiderations.yesRadioOption) {
      this.recordAnswer(otherConsiderations.giveDetailsHiddenTextLabel, otherConsiderationsData.courtInfo);
      await performAction(
        'inputText',
        otherConsiderations.giveDetailsHiddenTextLabel,
        otherConsiderationsData.courtInfo
      );
    } else {
      this.deleteAnswer(otherConsiderations.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  }

  private async uploadFiles(uploadDocs: actionRecord): Promise<void> {
    if (uploadDocs?.files) {
      const uploadedFiles = Array.isArray(uploadDocs.files) ? uploadDocs.files.join(', ') : String(uploadDocs.files);
      this.recordAnswer(rtcUploadedDocumentsQuestion, uploadedFiles);
      await performAction('uploadFile', uploadDocs.files);
    } else {
      this.recordAnswer(rtcUploadedDocumentsQuestion, rtcNoDocumentsUploadedValue);
    }
    await performAction('clickButton', uploadFiles.saveAndContinueButton);
  }

  private async selectWhatAreYouClaimingFor(claim: actionRecord): Promise<void> {
    this.recordAnswer(String(claim.question), claim.option);
    await performAction('clickRadioButton', {
      question: claim.question,
      option: claim.option,
    });
    await performAction('clickButton', counterClaimWhatAreYouClaimingFor.saveAndContinueButton);
  }

  private async counterClaimSpecificSumOfMoney(sumOfMoney: actionRecord): Promise<void> {
    this.recordAnswer(String(sumOfMoney.question), sumOfMoney.option);
    await performAction('clickRadioButton', {
      question: sumOfMoney.question,
      option: sumOfMoney.option,
    });

    if (sumOfMoney.option === counterClaimSpecificSumOfMoney.yesRadioOption) {
      this.recordAnswer(counterClaimSpecificSumOfMoney.howMuchAreYouClaimingHiddenQuestion, sumOfMoney.amount);
      await performAction(
        'inputText',
        counterClaimSpecificSumOfMoney.howMuchAreYouClaimingHiddenQuestion,
        sumOfMoney.amount
      );
    } else {
      this.recordAnswer(counterClaimSpecificSumOfMoney.maximumValueOfYourClaimHiddenQuestion, sumOfMoney.amount);
      await performAction(
        'inputText',
        counterClaimSpecificSumOfMoney.maximumValueOfYourClaimHiddenQuestion,
        sumOfMoney.amount
      );
    }
    await performAction('clickButton', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  }

  private async retrieveCYATableDataRTC(page: Page): Promise<void> {
    rtcCyaMap.clear();
    const tables = page.locator('//dl');
    const tableCount = await tables.count();

    if (tableCount === 0) {
      throw new Error('RTC CYA table not found. Exiting...');
    }

    for (let i = 0; i < tableCount; i++) {
      const currentTable = tables.nth(i);
      if (!(await currentTable.isVisible())) {
        continue;
      }

      const rows = currentTable.locator('.govuk-summary-list__row');
      const rowCount = await rows.count();
      for (let j = 0; j < rowCount; j++) {
        const row = rows.nth(j);
        if (!(await row.isVisible())) {
          continue;
        }

        const keyText = (await row.locator('dt.govuk-summary-list__key').first().innerText()).trim();
        const valueText = (await row.locator('dd.govuk-summary-list__value').first().innerText())
          .trim()
          .replace(/\r?\n+/g, ', ');

        if (keyText) {
          rtcCyaMap.set(keyText, valueText);
        }
      }
    }
  }

  private async validateCYARTC(): Promise<void> {
    const mismatches: string[] = [];
    const rtcValues = Array.from(rtcCyaMap.values());

    for (const [expectedKey, expectedValue] of Array.from(FieldsStore.getAll().entries())) {
      const actualValue = rtcCyaMap.get(expectedKey);
      if (actualValue !== undefined) {
        if (!this.areRtcCyaValuesEquivalent(String(expectedValue), actualValue)) {
          mismatches.push(
            `key: "${expectedKey}" -> Expected value containing "${expectedValue}" | Actual: "${actualValue}"`
          );
        }
        continue;
      }

      const matchedByValue = rtcValues.some(value => value.includes(String(expectedValue)));
      if (!matchedByValue) {
        mismatches.push(
          `key: "${expectedKey}" -> Expected value containing "${expectedValue}" but no matching CYA row was found`
        );
      }
    }

    if (mismatches.length > 0) {
      console.log(`\n❌ RTC CYA differences found: ${mismatches.length}`);
      for (const mismatch of mismatches) {
        console.log('============================================================');
        console.log(`• ${mismatch}`);
      }
      throw new Error(`RTC CYA validation failed for ${mismatches.length} item(s)`);
    }

    console.log('\n✅ RTC CHECK YOUR ANSWERS VALIDATION PASSED!\n');
  }

  private async validateRTCSectionCYA(sectionData: actionData): Promise<void> {
    const sectionName = String(sectionData);
    const expectedSectionAnswers = rtcSectionAnswers.get(sectionName);

    if (!expectedSectionAnswers || expectedSectionAnswers.size === 0) {
      throw new Error(`user selection is empty for ${sectionName}`);
    }

    const mismatches: string[] = [];
    const rtcValues = Array.from(rtcCyaMap.values());

    for (const [expectedKey, expectedValue] of Array.from(expectedSectionAnswers.entries())) {
      const actualValue = rtcCyaMap.get(expectedKey);
      if (actualValue !== undefined) {
        if (!this.areRtcCyaValuesEquivalent(String(expectedValue), actualValue)) {
          mismatches.push(
            `key: "${expectedKey}" -> Expected value containing "${expectedValue}" | Actual: "${actualValue}"`
          );
        }
        continue;
      }

      const matchedByValue = rtcValues.some(value => value.includes(String(expectedValue)));
      if (!matchedByValue) {
        mismatches.push(
          `key: "${expectedKey}" -> Expected value containing "${expectedValue}" but no matching CYA row was found`
        );
      }
    }

    if (mismatches.length > 0) {
      throw new Error(`RTC ${sectionName} section CYA validation failed:\n${mismatches.join('\n')}`);
    }
  }

  private async selectClaimAgainstWhom(claimAgainstWhom: actionRecord): Promise<void> {
    if (Array.isArray(claimAgainstWhom.options)) {
      this.recordAnswer(String(claimAgainstWhom.question), claimAgainstWhom.options);
      for (const option of claimAgainstWhom.options) {
        await performAction('check', {
          question: claimAgainstWhom.question,
          option,
        });
      }
    } else if (claimAgainstWhom.radioOption) {
      this.recordAnswer(String(claimAgainstWhom.question), claimAgainstWhom.radioOption);
      await performAction('check', {
        question: claimAgainstWhom.question,
        option: claimAgainstWhom.radioOption,
      });
    }
    await performAction('clickButton', counterClaimAgainstWhom.saveAndContinueButton);
  }

  private async counterClaimAbout(claimAbout: actionRecord): Promise<void> {
    this.recordAnswer(counterClaimAbout.whatIsYourCounterClaimLabelText, claimAbout.counterClaimFor);
    this.recordAnswer(counterClaimAbout.whatAreYourReasonsLabelText, claimAbout.reasonsInput);
    await performAction('inputText', counterClaimAbout.whatIsYourCounterClaimLabelText, claimAbout.counterClaimFor);
    await performAction('inputText', counterClaimAbout.whatAreYourReasonsLabelText, claimAbout.reasonsInput);
    await performAction('clickButton', counterClaimAbout.saveAndContinueButton);
  }

  private async counterClaimOrderOtherThanSum(cliamOtherThanSum: actionRecord): Promise<void> {
    this.recordAnswer(counterClaimOrderOtherThanSum.whatOrdersAreYouAskingLabelText, cliamOtherThanSum.ordersInput);
    this.recordAnswer(counterClaimOrderOtherThanSum.whatFactsWouldYouLikeLabelText, cliamOtherThanSum.factsInput);
    await performAction(
      'inputText',
      counterClaimOrderOtherThanSum.whatOrdersAreYouAskingLabelText,
      cliamOtherThanSum.ordersInput
    );
    await performAction(
      'inputText',
      counterClaimOrderOtherThanSum.whatFactsWouldYouLikeLabelText,
      cliamOtherThanSum.factsInput
    );
    await performAction('clickButton', counterClaimOrderOtherThanSum.saveAndContinueButton);
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
