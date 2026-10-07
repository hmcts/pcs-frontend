import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  adjustmentToGetIntoBuilding,
  bringSupportToCourtHearing,
  checkYourAnswersRTC,
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  counterclaimYouNeedToApplyForHelpWithYourFees,
  dashboard,
  defendantDateOfBirth,
  defendantNameCapture,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveASolicitor,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  doYouWantToUploadFilesToSupportYourCounterclaim,
  documentInAlternativeFormat,
  equalityAndDiversityAbilityToCarryOutActivity,
  equalityAndDiversityDOB,
  equalityAndDiversityEnd,
  equalityAndDiversityEthinicGroup,
  equalityAndDiversityHealthCondiotion,
  equalityAndDiversityHowYouThink,
  equalityAndDiversityLanguage,
  equalityAndDiversityMarriedOrCivilPartnership,
  equalityAndDiversityPregnancy,
  equalityAndDiversityReligion,
  equalityAndDiversitySameGender,
  equalityAndDiversityStart,
  equalityAndDiversityYourSex,
  exceptionalHardship,
  exemptLandLord,
  feelComfortableDuringHearing,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  helpWithForms,
  helpcommunicatingAndUnderstanding,
  incomeAndExpenses,
  installmentPayments,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  physicalMentalOrLearningDisability,
  priorityDebtDetails,
  priorityDebts,
  reasonableAdjustmentsTriage,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  requestCertainTypeOfHearing,
  reviewSupport,
  startNow,
  supportRequest,
  supportRequestNotSent,
  taskList,
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
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-enabled');
  await performAction('resetRTCAnswerStore');
  process.env.WALES_POSTCODE = 'YES';
  process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
  process.env.CLAIMANT_NAME = submitCaseApiDataWales.submitCasePayload.claimantName;
  if (testInfo.title.includes('Secure')) {
    process.env.OCCUPATION_LICENCE_TYPE = 'SECURE_CONTRACT';
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
    process.env.RENT_NON_RENT = 'NO';
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

  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/access-your-case`);
  await performAction('accessYourCase', { caseNumber: process.env.CASE_NUMBER });
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('When the user clicks the button', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @PR @smoke', async () => {
    //Single named party - A sum of money or comp - specific sum of money (Yes) - counterclaimFee- I need help
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.yesRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
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
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown');
    await performAction('rentArrears', {
      option: rentArrears.yesRadioOption,
    });
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
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.yesRadioOption,
    });
    await performAction('uploadFilesToSupportCounterclaim', { files: ['rentArrears.pdf'] });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'disputeAndTenancy');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.declareRecentPaymentsHiddenLink,
    });
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'situationAndCircumstances');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'situationAndCircumstances');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.incomeAndExpensesLink,
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
    await performValidation('Then the user sees the main header', whatOtherRegularExpensesDoYouHave.mainHeader);
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'incomeAndExpenditure');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'incomeAndExpenditure');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskListStatus', {
      subSecArray: [taskList.readInformationAboutLink, taskList.respondToSpecificPartsOfClaimantsClaimLink, taskList.incomeAndExpensesLink, taskList.uploadDocumentsLink, taskList.confirmDetailsLink],
      status: 'Done',
    });
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.checkYourAnswersAndSubmitHiddenLink,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityStart.mainHeader);
    await performAction('When the user clicks the button', equalityAndDiversityStart.idontWantToAnswerQuestions);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section');
    await performAction('validateCYARTC');
    await performAction('selectStatementOfTruthRTC', {
      options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
      input: checkYourAnswersRTC.yourFullNameTextInput,
    });
    await performAction('When the user clicks the button', 'Close and return to case overview');
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('Respond to a claim - Wales - Standard contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes @noDefendants', async () => {
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCaseRentNonRentStandard.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.noRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiDataWales.submitCaseRentNonRentStandard.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
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
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'disputeAndTenancy');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.declareRecentPaymentsHiddenLink,
    });
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performValidation('Then the user sees the main header', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Other contract - Rent Arrears @noDefendants @regression', async () => {
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCaseRentOtherTenancy.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.imNotSureRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiDataWales.submitCaseRentOtherTenancy.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('And the user enters the tenancy start details when unknown');
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.imNotSureRadioOption,
    });
    await performAction('rentArrears', {
      option: rentArrears.yesRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'disputeAndTenancy');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.declareRecentPaymentsHiddenLink,
    });
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'situationAndCircumstances');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'situationAndCircumstances');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.incomeAndExpensesLink,
    });
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
    });
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'incomeAndExpenditure');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'incomeAndExpenditure');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskListStatus', {
      subSecArray: [taskList.readInformationAboutLink, taskList.respondToSpecificPartsOfClaimantsClaimLink, taskList.incomeAndExpensesLink, taskList.uploadDocumentsLink, taskList.confirmDetailsLink],
      status: 'Done',
    });
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.checkYourAnswersAndSubmitHiddenLink,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityStart.mainHeader);
    await performAction('When the user clicks the button', equalityAndDiversityStart.idontWantToAnswerQuestions);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('When the user clicks the button', 'Submit');
  });

  test('Respond to a claim - Wales - Standard contract - NonRentArrears - SelectCounterClaim - No @noDefendants @regression', async () => {
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCaseNonRentStandard.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.yesRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiDataWales.submitCaseNonRentStandard.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('And the user enters the tenancy start details when unknown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'disputeAndTenancy');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performValidation('Then the user sees the main header', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Standard contract - NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp - SomethingElse @noDefendants @regression', async () => {
    //Single named party - Something else - iDoNotNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCaseNonRentStandard.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.noRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiDataWales.submitCaseNonRentStandard.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('And the user enters the tenancy start details when unknown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.noRadioOption,
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
    await performAction('counterClaimHaveYouAppliedForHelpWithFee', {
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.noRadioOption,
    });
    await performValidation('Then the user sees the main header', counterclaimYouNeedToApplyForHelpWithYourFees.mainHeader);
  });
});

test.describe('Common Component YS And PCQ Respond to a claim - e2e Journey @nightly ', async () => {
  test('Your Support Request Sent to Court And PCQ Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @regression @nightly', async () => {
    //Single named party - A sum of money or comp - specific sum of money (Yes) - counterclaimFee- I need help
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.yesRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
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
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown');
    await performAction('rentArrears', {
      option: rentArrears.yesRadioOption,
    });
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
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.yesRadioOption,
    });
    await performAction('uploadFilesToSupportCounterclaim', { files: ['rentArrears.pdf'] });
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.declareRecentPaymentsHiddenLink,
    });
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'situationAndCircumstances');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'situationAndCircumstances');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.incomeAndExpensesLink,
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
    await performValidation('Then the user sees the main header', whatOtherRegularExpensesDoYouHave.mainHeader);
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'incomeAndExpenditure');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'incomeAndExpenditure');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskListStatus', {
      subSecArray: [taskList.readInformationAboutLink, taskList.respondToSpecificPartsOfClaimantsClaimLink, taskList.incomeAndExpensesLink, taskList.uploadDocumentsLink, taskList.confirmDetailsLink],
      status: 'Done',
    });
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.continueToQuestionsButton);
    await performAction('selectReasonableAdjustments', {
      header: physicalMentalOrLearningDisability.mainHeader,
      options: [
        physicalMentalOrLearningDisability.adjustmentsToGetIntoBuildingCheckbox,
        physicalMentalOrLearningDisability.documentInAlternativeFormatCheckbox,
        physicalMentalOrLearningDisability.communicationCheckbox,
        physicalMentalOrLearningDisability.helpWithFormCheckbox,
        physicalMentalOrLearningDisability.hearingCheckbox,
        physicalMentalOrLearningDisability.bringSupportCheckbox,
        physicalMentalOrLearningDisability.askCertainTypeOfHearingCheckbox,
      ],
      button: physicalMentalOrLearningDisability.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: adjustmentToGetIntoBuilding.mainHeader,
      options: [adjustmentToGetIntoBuilding.accessibleToiletCheckbox, adjustmentToGetIntoBuilding.helpUsingALiftCheckbox, adjustmentToGetIntoBuilding.useOfVenueWheelchairCheckbox],
      button: adjustmentToGetIntoBuilding.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: documentInAlternativeFormat.mainHeader,
      options: [documentInAlternativeFormat.audioTranslationOfDocumentsCheckbox, documentInAlternativeFormat.brailleDocumentsCheckbox, documentInAlternativeFormat.informationEmailedToMeCheckbox],
      button: documentInAlternativeFormat.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: helpcommunicatingAndUnderstanding.mainHeader,
      options: [helpcommunicatingAndUnderstanding.extraTimeToThinkAndExplainMyselfCheckbox, helpcommunicatingAndUnderstanding.needToBeCloseToWhoIsSpeakingCheckbox],
      button: helpcommunicatingAndUnderstanding.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: helpWithForms.mainHeader,
      options: [helpWithForms.noHelpWithFormsCheckbox],
      button: helpWithForms.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: feelComfortableDuringHearing.mainHeader,
      options: [feelComfortableDuringHearing.privateWaitingAreaCheckbox, feelComfortableDuringHearing.regularBreaksCheckbox],
      button: feelComfortableDuringHearing.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: bringSupportToCourtHearing.mainHeader,
      options: [bringSupportToCourtHearing.noSupportToBringWithMeCheckbox],
      button: bringSupportToCourtHearing.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: requestCertainTypeOfHearing.mainHeader,
      options: [requestCertainTypeOfHearing.noCertainTypeOfHearingCheckbox],
      button: requestCertainTypeOfHearing.continueButton,
    });
    await performValidation('Then the user sees the main header', reviewSupport.mainHeader);
    await performAction('When the user clicks the button', reviewSupport.submitButton);
    await performValidation('Then the user sees the main header', supportRequest.mainHeader);
    await performAction('When the user clicks the button', supportRequest.continueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.checkYourAnswersAndSubmitHiddenLink,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityStart.mainHeader);
    await performAction('When the user clicks the button', equalityAndDiversityStart.continueButton);
    await performValidation('Then the user sees the main header', equalityAndDiversityDOB.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityDOB.mainHeader,
      radioOption: equalityAndDiversityDOB.preferNotToSayRadioButton,
      button: equalityAndDiversityDOB.continueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityLanguage.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityLanguage.mainHeader,
      radioOption: equalityAndDiversityLanguage.englishRadioOption,
      button: equalityAndDiversityLanguage.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityYourSex.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityYourSex.mainHeader,
      radioOption: equalityAndDiversityYourSex.femaleRadioOption,
      button: equalityAndDiversityYourSex.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversitySameGender.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversitySameGender.mainHeader,
      radioOption: equalityAndDiversitySameGender.yesRadioOption,
      button: equalityAndDiversitySameGender.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityHowYouThink.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityHowYouThink.mainHeader,
      radioOption: equalityAndDiversityHowYouThink.hetroRadioOption,
      button: equalityAndDiversityHowYouThink.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityMarriedOrCivilPartnership.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityMarriedOrCivilPartnership.mainHeader,
      radioOption: equalityAndDiversityMarriedOrCivilPartnership.preferNotToSayRadioOption,
      button: equalityAndDiversityMarriedOrCivilPartnership.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityEthinicGroup.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityEthinicGroup.mainHeader,
      radioOption: equalityAndDiversityEthinicGroup.preferNotToSayRadioOption,
      button: equalityAndDiversityEthinicGroup.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityReligion.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityReligion.mainHeader,
      radioOption: equalityAndDiversityReligion.sikhRadioOption,
      button: equalityAndDiversityReligion.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityHealthCondiotion.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityHealthCondiotion.mainHeader,
      radioOption: equalityAndDiversityHealthCondiotion.yesRadioOption,
      button: equalityAndDiversityHealthCondiotion.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityAbilityToCarryOutActivity.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityAbilityToCarryOutActivity.mainHeader,
      radioOption: equalityAndDiversityAbilityToCarryOutActivity.preferNotToSayRadioOption,
      button: equalityAndDiversityAbilityToCarryOutActivity.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityPregnancy.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityPregnancy.mainHeader,
      radioOption: equalityAndDiversityPregnancy.noRadioOption,
      button: equalityAndDiversityPregnancy.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityEnd.mainHeader);
    await performAction('When the user clicks the button', equalityAndDiversityEnd.continueButton);

    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section');
    await performAction('selectStatementOfTruthRTC', {
      options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
      input: checkYourAnswersRTC.yourFullNameTextInput,
    });
    await performAction('When the user clicks the button', 'Close and return to case overview');
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('Your Support Request NOT Sent to Court Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @regression @nightly', async () => {
    //Single named party - A sum of money or comp - specific sum of money (Yes) - counterclaimFee- I need help
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction('When the user responds to the dispute claim interstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('exemptLandLord', exemptLandLord.yesRadioOption);
    await performValidation('Then the user sees the main header', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('And the user enters the tenancy or contract type details', {
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
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown');
    await performAction('rentArrears', {
      option: rentArrears.yesRadioOption,
    });
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
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.yesRadioOption,
    });
    await performAction('uploadFilesToSupportCounterclaim', { files: ['rentArrears.pdf'] });
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.declareRecentPaymentsHiddenLink,
    });
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'situationAndCircumstances');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'situationAndCircumstances');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.incomeAndExpensesLink,
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
    await performValidation('Then the user sees the main header', whatOtherRegularExpensesDoYouHave.mainHeader);
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
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'incomeAndExpenditure');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'incomeAndExpenditure');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskListStatus', {
      subSecArray: [taskList.readInformationAboutLink, taskList.respondToSpecificPartsOfClaimantsClaimLink, taskList.incomeAndExpensesLink, taskList.uploadDocumentsLink, taskList.confirmDetailsLink],
      status: 'Done',
    });
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.continueToQuestionsButton);
    await performAction('selectReasonableAdjustments', {
      header: physicalMentalOrLearningDisability.mainHeader,
      options: [physicalMentalOrLearningDisability.bringSupportCheckbox, physicalMentalOrLearningDisability.askCertainTypeOfHearingCheckbox],
      button: physicalMentalOrLearningDisability.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: bringSupportToCourtHearing.mainHeader,
      options: [bringSupportToCourtHearing.noSupportToBringWithMeCheckbox],
      button: bringSupportToCourtHearing.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: requestCertainTypeOfHearing.mainHeader,
      options: [requestCertainTypeOfHearing.noCertainTypeOfHearingCheckbox],
      button: requestCertainTypeOfHearing.continueButton,
    });
    await performValidation('Then the user sees the main header', reviewSupport.mainHeader);
    await performAction('When the user clicks the button', reviewSupport.submitButton);
    await performValidation('Then the user sees the main header', supportRequestNotSent.mainHeader);
    await performAction('When the user clicks the button', supportRequestNotSent.continueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.checkYourAnswersAndSubmitHiddenLink,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityStart.mainHeader);
    await performAction('When the user clicks the button', equalityAndDiversityStart.idontWantToAnswerQuestions);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section');
    await performAction('selectStatementOfTruthRTC', {
      options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
      input: checkYourAnswersRTC.yourFullNameTextInput,
    });
    await performAction('When the user clicks the button', 'Close and return to case overview');
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });
});
