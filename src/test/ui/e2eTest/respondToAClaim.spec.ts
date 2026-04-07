import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  exceptionalHardship,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  installmentPayments,
  nonRentArrearsDispute,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyDateDetails,
  tenancyTypeDetails,
  uploadDocuments,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLoveIfYouHadToLeaveYourHome,
  yourCircumstances,
  yourHouseholdAndCircumstances,
} from '../data/page-data';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayload.claimantName;
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }

  // Notice date provided
  if (testInfo.title.includes('NoticeDateProvided - No')) {
    process.env.NOTICE_DATE_PROVIDED = 'NO';
  } else if (testInfo.title.includes('NoticeDateProvided - Yes')) {
    process.env.NOTICE_DATE_PROVIDED = 'YES';
  }

  // Assign the tenancy type & grounds in the payload
  const tenancyKey = ['Introductory', 'Demoted', 'Assured', 'Secure', 'Flexible'].find(type =>
    testInfo.title.includes(type)
  );

  switch (tenancyKey) {
    case 'Introductory':
      process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
      process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
      break;

    case 'Demoted':
      process.env.TENANCY_TYPE = 'DEMOTED_TENANCY';
      process.env.GROUNDS = 'RENT_ARREARS';
      break;

    case 'Assured':
      process.env.TENANCY_TYPE = 'ASSURED_TENANCY';
      break;

    case 'Secure':
      process.env.TENANCY_TYPE = 'SECURE_TENANCY';
      break;

    case 'Flexible':
      process.env.TENANCY_TYPE = 'FLEXIBLE_TENANCY';
      break;
  }

  //Check if No or Im not sure is selected on NoticeDetails page - for back link navigation
  if (testInfo.title.includes('NoticeDetails - No') || testInfo.title.includes('NoticeDetails - Im not sure')) {
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'YES';
  }

  // Tenancy start date logic for noDefendantTest and rentNonRent test
  if (testInfo.title.includes('NoticeServed - No') && !testInfo.title.includes('@rentNonRent')) {
    process.env.TENANCY_START_DATE_KNOWN = testInfo.title.includes('noDefendants') ? 'NO' : 'YES';
    process.env.RENT_NON_RENT = 'NO';
  } else {
    process.env.RENT_NON_RENT = 'YES';
  }

  // Check notice date provided for back link navigation
  if (testInfo.title.includes('NoticeDateProvided - No')) {
    process.env.NOTICE_DATE_PROVIDED = 'NO';
  } else if (testInfo.title.includes('NoticeDateProvided - Yes')) {
    process.env.NOTICE_DATE_PROVIDED = 'YES';
  }

  //Check if No or Im not sure is selected on NoticeDetails page - for back link navigation
  if (testInfo.title.includes('NoticeDetails - No') || testInfo.title.includes('NoticeDetails - Im not sure')) {
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'YES';
  } else {
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'NO';
  }

  // Tenancy start date logic for noDefendantTest
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.TENANCY_START_DATE_KNOWN = testInfo.title.includes('noDefendants') ? 'NO' : 'YES';
  }

  if (testInfo.title.includes('@noDefendants')) {
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  } else if (testInfo.title.includes('@assured')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  } else if (testInfo.title.includes('@secureFlexible')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy });
  } else if (testInfo.title.includes('@other')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadOtherTenancy });
  } else if (testInfo.title.includes('@rentNonRent')) {
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    process.env.TENANCY_START_DATE_KNOWN = 'YES';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadRentNonRent });
  } else {
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  }
  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

//@noDefendants(submitCasePayloadNoDefendants) represents all defendant details unknown pages and non-rent arrears
//All defendant details known pages and Rent-arrears routing is covered in submitCasePayload
//Mix and match of testcases needs to updated in e2etests once complete routing is implemented. ex: (Tendency type HDPI-3316 etc.)
test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  //Income and expenses - yes - Only Universal CREDIT - Priority debt
  test('Respond to a claim @noDefendants @regression @accessibility', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.yesRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadNoDefendants.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    //This is a placeholder page
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    // Downstream flow up to 'instalmentPayments' page should be modified since it's Non rent arrears test case.HDPI-5732
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performValidation('mainHeader', installmentPayments.mainHeader);
    await performAction('clickButton', installmentPayments.saveAndContinueButton);
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
    await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.continueButton);
    await performValidation('mainHeader', wouldYouHaveSomewhereElseToLoveIfYouHadToLeaveYourHome.mainHeader);
    await performAction('clickButton', wouldYouHaveSomewhereElseToLoveIfYouHadToLeaveYourHome.continueButton);
    await performValidation('mainHeader', yourCircumstances.mainHeader);
    await performAction('clickButton', yourCircumstances.continueButton);
    await performValidation('mainHeader', exceptionalHardship.mainHeader);
    await performAction('clickButton', exceptionalHardship.continueButton);
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.universalCreditParagraph,
          whatRegularIncomeDoYouReceive.universalCreditTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
      ],
    });
    await performValidation('mainHeader', priorityDebts.mainHeader);
  });

  test('Non-RentArrears - Assured- NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @assured @regression', async () => {
    //incomeAndExpenses - no - Upload docs
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadAssuredTenancy.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnown');
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    // Downstream flow up to 'repaymentsAgreed' page should be modified since it's Non rent arrears test case.HDPI-5732
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
    });
    await performValidation('mainHeader', situationInterstitialScreen.mainHeader);
    //include missing steps
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
    });
    await performValidation('mainHeader', uploadDocuments.mainHeader);
  });

  test('Non-RentArrears - Secure - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @secureFlexible @regression', async () => {
    //Income and expenses - yes - no option On regular Income - universal credit
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails');
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown');
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    // Downstream flow up to 'instalmentPayments' page should be modified since it's Non rent arrears test case.HDPI-5732
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performValidation('mainHeader', installmentPayments.mainHeader);
    //include missing steps
    await performAction('clickButton', installmentPayments.saveAndContinueButton);
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive');
    await performValidation('mainHeader', haveYouAppliedForUniversalCredit.mainHeader);
  });

  test('Non-RentArrears - Flexible - NoticeServed - Yes NoticeDateProvided - No - NoticeDetails - Im not sure - NonRentArrearsDispute @secureFlexible @regression', async () => {
    //Income and expenses - yes - all options except Universal Credit - universal credit
    await performAction('selectLegalAdvice', freeLegalAdvice.preferNotToSayRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnown');
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.imNotSureRadioOption,
    });
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.yesRadioOption,
      disputeInfo: nonRentArrearsDispute.explainClaimTextInput,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    // Downstream flow up to 'repaymentsAgreed' page should be modified since it's Non rent arrears test case.HDPI-5732
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.yesRadioOption,
      repaymentInfo: repaymentsMade.detailsTextInput,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });
    await performValidation('mainHeader', situationInterstitialScreen.mainHeader);
    //include missing steps
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
          whatRegularIncomeDoYouReceive.pensionTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
          whatRegularIncomeDoYouReceive.totalAmountReceivedIncomeFromJobsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
          whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
          whatRegularIncomeDoYouReceive.detailsAboutOtherSourcesOfIncomeTextInput,
        ],
      ],
    });
    await performValidation('mainHeader', haveYouAppliedForUniversalCredit.mainHeader);
  });

  test('England - Flexible - NonRentArrears - NoticeServed - No NoticeDateProvided - No - NonRentArrearsDispute @secureFlexible @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnown');
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    // Downstream flow up to 'repaymentsAgreed' page should be modified since it's Non rent arrears test case.HDPI-5732
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
  });

  test('RentArrears - Introductory - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @regression', async () => {
    //universal credit with all other options - priority debts
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.yesRadioOption,
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performAction('rentArrears', {
      option: rentArrears.yesRadioOption,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });
    await performValidation('mainHeader', situationInterstitialScreen.mainHeader);
    //include missing steps
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader)
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
          whatRegularIncomeDoYouReceive.pensionTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
          whatRegularIncomeDoYouReceive.totalAmountReceivedIncomeFromJobsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
          whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
          whatRegularIncomeDoYouReceive.detailsAboutOtherSourcesOfIncomeTextInput,
        ],
        [
          whatRegularIncomeDoYouReceive.universalCreditParagraph,
          whatRegularIncomeDoYouReceive.universalCreditTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
      ],
    });
    await performValidation('mainHeader', priorityDebts.mainHeader);
  });

  test('RentArrears - Demoted - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.yesRadioOption,
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown', {
      day: '25',
      month: '2',
      year: '2020',
    });
    await performAction('rentArrears', {
      option: rentArrears.noRadioOption,
      rentAmount: rentArrears.rentAmountTextInput,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
  });

  test('RentArrears - Demoted - NoticeServed - Yes - NoticeDateProvided - Yes NoticeDetails - No - RentArrearsDispute  @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.noRadioOption,
    });
    await performAction('rentArrears', {
      option: rentArrears.imNotSureRadioOption,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performValidation('mainHeader', installmentPayments.mainHeader);
    await performAction('clickButton', installmentPayments.saveAndContinueButton);
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
  });

  test('England - RentArrears - NonRentArrears - NoticeServed - No - RentArrearsDispute @rentNonRent @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadRentNonRent.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadRentNonRent.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('rentArrears', {
      option: rentArrears.yesRadioOption,
    });
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performValidation('mainHeader', installmentPayments.mainHeader);
    await performAction('clickButton', installmentPayments.saveAndContinueButton);
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
  });
});
