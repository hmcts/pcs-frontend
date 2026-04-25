import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  defendantDateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  equalityAndDiversityEnd,
  equalityAndDiversityStart,
  exceptionalHardship,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  languageUsed,
  nonRentArrearsDispute,
  priorityDebtDetails,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyDateDetails,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data';
import { contactPreferenceEmailOrPostErrorValidation } from '../functional/contactPreferenceEmailOrPost.pft';
import { contactPreferencesTelephoneErrorValidation } from '../functional/contactPreferencesTelephone.pft';
import { contactPreferencesTextMessageErrorValidation } from '../functional/contactPreferencesTextMessage.pft';
import {
  correspondenceAddressErrorValidation,
  correspondenceAddressKnownErrorValidation,
} from '../functional/correspondenceAddress.pft';
import { defendantDateOfBirthErrorValidation } from '../functional/defendantDateOfBirth.pft';
import { defendantNameCaptureErrorValidation } from '../functional/defendantNameCapture.pft';
import { defendantNameConfirmationErrorValidation } from '../functional/defendantNameConfirmation.pft';
import { doAnyOtherAdultsLiveInYourHomeErrorValidation } from '../functional/doAnyOtherAdultsLiveInYourHome.pft';
import { doYouHaveAnyDependantChildrenErrorValidation } from '../functional/doYouHaveAnyDependantChildren.pft';
import { doYouHaveAnyOtherDependantsErrorValidation } from '../functional/doYouHaveAnyOtherDependants.pft';
import { yourExceptionalHardShipErrorValidation } from '../functional/exceptionalHardship.pft';
import { freeLegalAdviceErrorValidation } from '../functional/freeLegalAdvice.pft';
import { languageUsedErrorValidation } from '../functional/languageUsed.pft';
import { nonRentArrearsDisputeErrorValidation } from '../functional/nonRentArrearsDispute.pft';
import { noticeDateWhenProvidedErrorValidation } from '../functional/noticeDateWhenProvided.pft';
import { rentArrearsErrorValidation } from '../functional/rentArrears.pft';
import { repaymentsAgreedErrorValidation } from '../functional/repaymentsAgreed.pft';
import { repaymentsMadeErrorValidation } from '../functional/repaymentsMade.pft';
import { tenancyDateDetailsErrorValidation } from '../functional/tenancyDateDetails.pft';
import { tenancyDateUnknownErrorValidation } from '../functional/tenancyDateUnknown.pft';
import { tenancyTypeDetailsErrorValidation } from '../functional/tenancyTypeDetails.pft';
import { wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation } from '../functional/wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.pft';
import { yourCircumstancesErrorValidation } from '../functional/yourCircumstances.pft';
import {
  assertAllErrorMessageValidations,
  clearErrorMessageValidationFailures,
  softErrorMessageValidation,
} from '../utils/common/error-message-validation-helper';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction, performActions, performValidation } from '../utils/controller';
import { ErrorMessageValidation } from '../utils/validations/custom-validations';

const home_url = config.get('e2e.testUrl') as string;
let claimantName: string;

const NO_EMV_READ_ONLY = 'Read-only / informational screen — no field error validation.';

async function continueThroughIncomeDebtsEquality(): Promise<void> {
  await performActions(
    'Continue through place holder pages for income, debts, expenses, equality',
    ['clickButton', incomeAndExpenses.continueButton],
    ['clickButton', whatRegularIncomeDoYouReceive.continueButton],
    ['clickButton', haveYouAppliedForUniversalCredit.continueButton],
    ['clickButton', priorityDebts.continueButton],
    ['clickButton', priorityDebtDetails.continueButton],
    ['clickButton', whatOtherRegularExpensesDoYouHave.continueButton],
    ['clickButton', equalityAndDiversityStart.continueButton],
    ['clickButton', equalityAndDiversityEnd.continueButton]
  );
}

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  claimantName = submitCaseApiData.submitCasePayload.claimantName;
  process.env.CLAIMANT_NAME = claimantName;
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

  //Check if No is selected on RepaymentAgreed page(Rent Arrears) - for back link navigation
  if (testInfo.title.includes('RentArrears - Demoted')) {
    process.env.REPAYMENT_AGREED = 'NO';
  }
  //Check if No is selected on Installment Payment page(Rent Arrears) - for back link navigation
  if (testInfo.title.includes('InstallmentPayment - No')) {
    process.env.INSTALLMENT_PAYMENT = 'NO';
  }

  // Tenancy start date logic for noDefendantTest
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.TENANCY_START_DATE_KNOWN = testInfo.title.includes('noDefendants') ? 'NO' : 'YES';
  }

  if (testInfo.title.includes('@noDefendants')) {
    claimantName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
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
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await softErrorMessageValidation('startNow', NO_EMV_READ_ONLY);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(() => {
  ErrorMessageValidation.clearResults();
  clearErrorMessageValidationFailures();
});

test.describe('Respond to claim — error message validation @nightly @error', () => {
  test('RentArrears - Introductory - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @regression @error', async () => {
    await softErrorMessageValidation('freeLegalAdvice', freeLegalAdviceErrorValidation);
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);

    await softErrorMessageValidation('defendantNameConfirmation', defendantNameConfirmationErrorValidation);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });

    await softErrorMessageValidation('defendantDateOfBirth', defendantDateOfBirthErrorValidation);
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });

    await softErrorMessageValidation('correspondenceAddressKnown', correspondenceAddressKnownErrorValidation);
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });

    await softErrorMessageValidation('contactPreferenceEmailOrPost', contactPreferenceEmailOrPostErrorValidation);
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });

    await softErrorMessageValidation('contactPreferencesTelephone', contactPreferencesTelephoneErrorValidation);
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });

    await softErrorMessageValidation('disputeClaimInterstitial', NO_EMV_READ_ONLY);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);

    await softErrorMessageValidation('tenancyTypeDetails', tenancyTypeDetailsErrorValidation);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });

    await softErrorMessageValidation('tenancyDateDetails', tenancyDateDetailsErrorValidation);
    await performAction('selectTenancyStartDateKnown', { option: tenancyDateDetails.yesRadioOption });

    // confirmationOfNoticeGiven EMV deferred — HDPI-6087
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');

    await softErrorMessageValidation('rentArrears', rentArrearsErrorValidation);
    await performAction('rentArrears', { option: rentArrears.yesRadioOption });

    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);

    await softErrorMessageValidation('PaymentInterstitial', NO_EMV_READ_ONLY);
    await performAction('readPaymentInterstitial');

    await softErrorMessageValidation('repaymentsMade', repaymentsMadeErrorValidation);
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });

    await softErrorMessageValidation('repaymentsAgreed', repaymentsAgreedErrorValidation);
    await performAction('repaymentsAgreed', {
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });

    await softErrorMessageValidation('YourHouseholdAndCircumstances', NO_EMV_READ_ONLY);
    await performAction('readYourHouseholdAndCircumstances');

    await softErrorMessageValidation('doYouHaveAnyDependantChildren', doYouHaveAnyDependantChildrenErrorValidation);
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });

    await softErrorMessageValidation('doYouHaveAnyOtherDependants', doYouHaveAnyOtherDependantsErrorValidation);
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });

    await softErrorMessageValidation('doAnyOtherAdultsLiveInYourHome', doAnyOtherAdultsLiveInYourHomeErrorValidation);
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
    });

    await softErrorMessageValidation(
      'wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome',
      wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation
    );
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.noRadioOption,
    });

    await softErrorMessageValidation('yourCircumstances', yourCircumstancesErrorValidation);
    await performAction('yourCircumstances', {
      question: yourCircumstances.mainHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });

    await softErrorMessageValidation('exceptionalHardship', yourExceptionalHardShipErrorValidation);
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });

    await continueThroughIncomeDebtsEquality();

    await softErrorMessageValidation('languageUsed', languageUsedErrorValidation);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });

    assertAllErrorMessageValidations();
  });

  test('Non-RentArrears - Secure - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @secureFlexible @regression @error', async () => {
    await softErrorMessageValidation('freeLegalAdvice', freeLegalAdviceErrorValidation);
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);

    await softErrorMessageValidation('defendantNameCapture', defendantNameCaptureErrorValidation);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });

    await softErrorMessageValidation('defendantDateOfBirth', defendantDateOfBirthErrorValidation);
    await performAction('enterDateOfBirthDetails');

    await softErrorMessageValidation('correspondenceAddressUnknown', correspondenceAddressErrorValidation);
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });

    await softErrorMessageValidation('contactPreferenceEmailOrPost', contactPreferenceEmailOrPostErrorValidation);
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });

    await softErrorMessageValidation('contactPreferencesTelephone', contactPreferencesTelephoneErrorValidation);
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });

    await softErrorMessageValidation('contactPreferencesTextMessage', contactPreferencesTextMessageErrorValidation);
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);

    await softErrorMessageValidation('disputeClaimInterstitial', NO_EMV_READ_ONLY);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.isClaimantNameCorrect
    );

    await softErrorMessageValidation('tenancyTypeDetails', tenancyTypeDetailsErrorValidation);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });

    await softErrorMessageValidation('tenancyDateUnknown', tenancyDateUnknownErrorValidation);
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });

    // confirmationOfNoticeGiven EMV deferred — HDPI-6087
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });

    await softErrorMessageValidation('noticeDateWhenProvided', noticeDateWhenProvidedErrorValidation);
    await performAction('enterNoticeDateKnown');

    await softErrorMessageValidation('nonRentArrearsDispute', nonRentArrearsDisputeErrorValidation);
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });

    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);

    await softErrorMessageValidation('PaymentInterstitial', NO_EMV_READ_ONLY);
    await performAction('readPaymentInterstitial');

    await softErrorMessageValidation('repaymentsMade', repaymentsMadeErrorValidation);
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });

    await softErrorMessageValidation('repaymentsAgreed', repaymentsAgreedErrorValidation);
    await performAction('repaymentsAgreed', {
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
    });

    await softErrorMessageValidation('YourHouseholdAndCircumstances', NO_EMV_READ_ONLY);
    await performAction('readYourHouseholdAndCircumstances');

    await softErrorMessageValidation('doYouHaveAnyDependantChildren', doYouHaveAnyDependantChildrenErrorValidation);
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });

    await softErrorMessageValidation('doYouHaveAnyOtherDependants', doYouHaveAnyOtherDependantsErrorValidation);
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });

    await softErrorMessageValidation('doAnyOtherAdultsLiveInYourHome', doAnyOtherAdultsLiveInYourHomeErrorValidation);
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });

    await softErrorMessageValidation(
      'wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome',
      wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation
    );
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
    });

    await softErrorMessageValidation('yourCircumstances', yourCircumstancesErrorValidation);
    await performAction('yourCircumstances', {
      question: yourCircumstances.mainHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });

    await softErrorMessageValidation('exceptionalHardship', yourExceptionalHardShipErrorValidation);
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });

    await continueThroughIncomeDebtsEquality();

    await softErrorMessageValidation('languageUsed', languageUsedErrorValidation);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });

    assertAllErrorMessageValidations();
  });
});
