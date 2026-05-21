import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimFee,
  counterClaimHaveYouAlreadyAppliedForHelpWithYourFees,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  counterclaimYouNeedToApplyForHelpWithYourFees,
  defendantDateOfBirth,
  defendantNameCapture,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  equalityAndDiversityEnd,
  equalityAndDiversityStart,
  exceptionalHardship,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  installmentPayments,
  landlordLicensed,
  landlordRegistered,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  priorityDebtDetails,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  supportNeeds,
  tenancyDateDetails,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  writtenTerms,
  yourCircumstances,
} from '../data/page-data';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;
let claimantName: string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.WALES_POSTCODE = 'YES';
  process.env.CLAIMANT_NAME = submitCaseApiDataWales.submitCasePayload.claimantName;
  if (testInfo.title.includes('Secure')) {
    process.env.OCCUPATION_LICENCE_TYPE = 'SECURE_CONTRACT';
  }

  //Page navigation for paymentInterstitial
  if (testInfo.title.includes('SelectCounterClaim - Yes')) {
    process.env.SELECT_COUNTER_CLAIM = 'YES';
  } else {
    process.env.SELECT_COUNTER_CLAIM = 'NO';
  }

  submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales = process.env.OCCUPATION_LICENCE_TYPE;
  claimantName = process.env.CLAIMANT_NAME;
  await performAction('createCaseAPI', { data: createCaseApiWalesData.createCasePayload });
  if (process.env.OCCUPATION_LICENCE_TYPE === 'SECURE_CONTRACT') {
    process.env.RENT_NON_RENT = 'YES';
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCasePayload });
  } else if (testInfo.title.includes('Standard contract - RentArrears and NonRentArrears')) {
    process.env.RENT_NON_RENT = 'YES';
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseRentNonRentStandard });
  } else if (testInfo.title.includes('NonRentArrears')) {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseNonRentStandard });
  } else {
    process.env.RENT_ARREARS = 'YES';
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseRentOtherTenancy });
  }
  //other considrations back link navigation
  if (testInfo.title.includes('Income - no')) {
    process.env.INCOME_AND_EXPENSES = 'NO';
  } else {
    process.env.INCOME_AND_EXPENSES = 'YES';
  }

  //counterClaimFee back link navigation
  if (testInfo.title.includes('SomethingElse')) {
    process.env.SOMETHING_ELSE = 'YES';
  } else {
    process.env.SOMETHING_ELSE = 'NO';
  }

  //paymentInterstitial back navigation
  if (testInfo.title.includes('CounterClaimFee - INeedHelp')) {
    process.env.I_NEED_HELP = 'YES';
  } else {
    process.env.I_NEED_HELP = 'NO';
  }

  if (testInfo.title.includes('SelectCounterClaim - No')) {
    process.env.SELECT_COUNTER_CLAIM = 'NO';
  } else {
    process.env.SELECT_COUNTER_CLAIM = 'YES';
  }

  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
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

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @noDefendants @regression @PR', async () => {
    //Single named party - A sum of money or comp - specific sum of money (Yes) - counterclaimFee- I need help
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction('disputeClaimInterstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('clickRadioButton', rentArrears.yesRadioOption);
    await performAction('clickButton', rentArrears.saveAndContinueButton);
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingFor', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoney', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.yesRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('counterClaimHaveYouAppliedForHelpWithFee', {
      helpWithFeeOption: counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.yesRadioOption,
      feeReference: counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.helpWithFeeReferenceTextInput,
    });
    await performValidation('mainHeader', counterClaimAbout.mainHeader);
    await performAction('clickButton', counterClaimAbout.continueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.noRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.mainHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive');
    await performAction('selectUniversalCredit', {
      question: haveYouAppliedForUniversalCredit.mainHeader,
      creditRadioOption: haveYouAppliedForUniversalCredit.noRadioOption,
    });
    await performAction('selectPriorityDebts', {
      question: priorityDebts.doYouHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.yesRadioOption,
    });
    await performAction('enterPriorityDebtDetails', {
      totalAmount: priorityDebtDetails.totalAmountTextInput,
      payAmount: priorityDebtDetails.amountYouPayTextInput,
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetails.weekRadioOption,
    });
    await performValidation('mainHeader', whatOtherRegularExpensesDoYouHave.mainHeader);
    await performAction('selectWhatOtherRegularExpensesDoYouHave', {
      regularIncomeOptions: [
        [
          whatOtherRegularExpensesDoYouHave.groceryShoppingParagraph,
          whatOtherRegularExpensesDoYouHave.groceryShoppingTotalAmountInput,
          whatOtherRegularExpensesDoYouHave.groceryShoppingWeekHiddenRadioOption,
        ],
      ],
    });
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.yesRadioOption,
      courtInfo: otherConsiderations.detailsTextInput,
    });
    await performAction('uploadFiles');
    await performAction('clickButton', supportNeeds.continueButton);
    await performValidation('mainHeader', equalityAndDiversityStart.mainHeader);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEnd.mainHeader);
    await performAction('clickButton', equalityAndDiversityEnd.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
  });

  test('Respond to a claim - Wales - Standard contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes @noDefendants', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiDataWales.submitCaseRentNonRentStandard.isClaimantNameCorrect
    );
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCaseRentNonRentStandard.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('clickRadioButton', rentArrears.yesRadioOption);
    await performAction('clickButton', rentArrears.saveAndContinueButton);
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingFor', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.bothRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoney', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performValidation('mainHeader', counterClaimAbout.mainHeader);
    await performAction('clickButton', counterClaimAbout.continueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.noRadioOption,
    });
    //Below code is disabled due to bug https://tools.hmcts.net/jira/browse/HDPI-6339
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Other contract - @noDefendants @PR', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiDataWales.submitCaseRentOtherTenancy.isClaimantNameCorrect
    );
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCaseRentOtherTenancy.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnown');
    // The below step should be enabled after the bug fix - https://tools.hmcts.net/jira/browse/HDPI-6021
    // await performAction('selectNoticeDetails', {
    //   option: confirmationOfNoticeGiven.imNotSureRadioOption,
    // });
    //   await performAction('clickRadioButton', rentArrears.yesRadioOption);
    //   await performAction('clickButton', rentArrears.saveAndContinueButton);
    //   await performValidation('mainHeader', counterClaim.mainHeader);
    //   await performAction('clickButton', counterClaim.saveAndContinueButton);
    //   await performAction('readPaymentInterstitial');
    //   await performAction('repaymentsMade', {
    //     question: repaymentsMade.getmainHeader(claimantName),
    //     repaymentOption: repaymentsMade.noRadioOption,
    //   });
    //   await performAction('repaymentsAgreed', {
    //     repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    //   });
    //   await performAction('installmentPayments', {
    //     question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
    //     radioOption: installmentPayments.noRadioOption,
    //   });
    //   await performAction('readYourHouseholdAndCircumstances');
    //   await performAction('doYouHaveAnyDependantChildren', {
    //     dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    //   });
    //   await performAction('doYouHaveAnyOtherDependants', {
    //     otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
    //     otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    //   });
    //   await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
    //     radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
    //     details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    //   });
    //   await performAction('selectAlternativeAccommodation', {
    //     radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    //   });
    //   await performValidation('mainHeader', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Standard contract - NonRentArrears - SelectCounterClaim - No @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiDataWales.submitCaseNonRentStandard.isClaimantNameCorrect
    );
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCaseNonRentStandard.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.noRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Standard contract - NonRentArrears - CounterClaim - Yes - CounterClaimFee - INeedHelp - SomethingElse @noDefendants @regression @PR', async () => {
    //Single named party - Something else - iDoNotNeedHelp
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiDataWales.submitCaseNonRentStandard.isClaimantNameCorrect
    );
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCaseNonRentStandard.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingFor', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('counterClaimHaveYouAppliedForHelpWithFee', {
      helpWithFeeOption: counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.noRadioOption,
    });
    await performValidation('mainHeader', counterclaimYouNeedToApplyForHelpWithYourFees.mainHeader);
  });
});
