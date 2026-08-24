import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  checkYourAnswersRTC,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  correspondenceAddress,
  counterClaim,
  dashboard,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveASolicitor,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  exceptionalHardship,
  freeLegalAdvice,
  incomeAndExpenses,
  languageUsed,
  otherConsiderations,
  reasonableAdjustmentsTriage,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  responseSubmittedCounterclaimFeePaymentNeeded,
  startNow,
  taskList,
  tenancyDateDetails,
  tenancyTypeDetails,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data';
import { DASHBOARD_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const claimantName = submitCaseApiData.submitCasePayload.claimantName;
const home_url = process.env.TEST_URL;
process.env.CLAIMANT_NAME = claimantName;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'NO';
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  logTestEnvAfterBeforeEach(testInfo.title, DASHBOARD_BEFORE_EACH_ENV_KEYS);
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/access-your-case`);
  await performAction('accessYourCase', { caseNumber: process.env.CASE_NUMBER });
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.describe('Respond to a claim - smoke test @health', async () => {
  test('Respond to a claim E2E Journey @crossbrowser @sanity', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('selectDoYouHaveASolicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.confirmDetailsLink });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
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
    await performAction('selectCounterClaim', {
      option: counterClaim.noRadioOption,
    });
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.declareRecentPaymentsHiddenLink });
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(submitCaseApiData.submitCasePayload.claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      question: repaymentsAgreed.getMainHeader(submitCaseApiData.submitCasePayload.claimantName),
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
    });
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.householdAndCircumstancesLink });
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
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.incomeAndExpensesLink });
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
    });
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.uploadDocumentsLink });
    await performAction('uploadFiles');
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('taskList', { subSection: taskList.checkYourAnswersAndSubmitHiddenLink });
    await performAction('clickButton', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('selectStatementOfTruthRTC', {
      options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
      input: checkYourAnswersRTC.yourFullNameTextInput,
    });
    await performAction(
      'clickButton',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('mainHeader', dashboard.mainHeader);
  });
});
