import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimFee,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  dashboard,
  defendantDateOfBirth,
  defendantNameCapture,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveASolicitor,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  doYouWantToUploadFilesToSupportYourCounterclaim,
  exceptionalHardship,
  freeLegalAdvice,
  incomeAndExpenses,
  nonRentArrearsDispute,
  otherConsiderations,
  priorityDebtDetails,
  priorityDebts,
  startNow,
  taskList,
  tenancyTypeDetails,
  uploadFiles,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data';
import { getRelativeDate } from '../utils/common/date.utils';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;
let claimantName: string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.WALES_POSTCODE = 'NO';
  claimantName = submitCaseApiData.submitCasePayload.claimantName;
  process.env.CLAIMANT_NAME = claimantName;
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }

  const isRentArrearsOnly =
    testInfo.title.includes('RentArrears') &&
    !testInfo.title.includes('NonRentArrears') &&
    !testInfo.title.includes('Respond to a claim');

  process.env.RENT_ARREARS = isRentArrearsOnly ? 'YES' : 'NO';

  if (testInfo.title.includes('@noDefendants')) {
    claimantName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
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
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/dashboard`);
  await performAction('clickButton', dashboard.startYourResponseLink);
  await performValidation('mainHeader', taskList.mainHeader);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim - TaskList - e2e Journey @nightly @PR', async () => {
  //Income and expenses - yes - Only Universal CREDIT - Priority debt
  test('Respond to a claim - TaskList @noDefendants @regression @crossbrowser @NonAutomaticEMV', async () => {
    //Counterclaim - yes - What are you claiming for - sum of money - Select counterclaim fee - I do not need help
    await performAction('taskList', { subSection: taskList.readInformationAboutLink });
    await performAction('clickButton', startNow.startNowButton);
    await performAction('clickButton', freeLegalAdvice.saveForLaterButton);
    await performAction('taskListStatus', {
      subSecArray: [
        taskList.readInformationAboutLink,
        taskList.respondToSpecificPartsOfClaimantsClaimLink,
        taskList.incomeAndExpensesLink,
        taskList.uploadDocumentsLink,
        taskList.confirmDetailsLink,
      ],
      status: 'Available',
    });
    await performAction('taskList', { subSection: taskList.readInformationAboutLink });
    await performAction('clickButton', startNow.startNowButton);
    await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', freeLegalAdvice.saveForLaterButton);

    await performAction('taskList', { subSection: taskList.confirmDetailsLink });
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('clickButton', defendantDateOfBirth.saveForLaterButton);
    await performAction('taskList', { subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performAction('clickRadioButton', tenancyTypeDetails.yesRadioOption);
    await performAction('clickButton', tenancyTypeDetails.saveForLaterButton);
    await performAction('taskList', { subSection: taskList.householdAndCircumstancesLink });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('clickRadioButton', doYouHaveAnyDependantChildren.noRadioOption);
    await performAction('clickButton', doYouHaveAnyDependantChildren.saveForLaterButton);
    await performAction('taskList', { subSection: taskList.incomeAndExpensesLink });
    await performAction('clickRadioButton', incomeAndExpenses.noRadioOption);
    await performAction('clickButton', incomeAndExpenses.saveForLaterButton);
    await performAction('taskList', { subSection: taskList.uploadDocumentsLink });
    await performAction('clickButton', uploadFiles.saveForLaterButton);
    await performAction('taskListStatus', {
      subSecArray: [
        taskList.readInformationAboutLink,
        taskList.respondToSpecificPartsOfClaimantsClaimLink,
        taskList.incomeAndExpensesLink,
        taskList.confirmDetailsLink,
      ],
      status: 'In progress',
    });
    await performAction('clickLink', taskList.backLink);
    await performValidation('text', { elementType: 'link', text: dashboard.continueYourResponseLink });
    await performAction('clickButton', dashboard.continueYourResponseLink);
    await performAction('taskListStatus', {
      subSecArray: [
        taskList.readInformationAboutLink,
        taskList.respondToSpecificPartsOfClaimantsClaimLink,
        taskList.incomeAndExpensesLink,
        taskList.confirmDetailsLink,
      ],
      status: 'In progress',
    });
    await performAction('taskList', { subSection: taskList.readInformationAboutLink });
    await performAction('clickButton', startNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('selectDoYouHaveASolicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('clickButton', 'Save and continue');
    await performAction('taskList', { subSection: taskList.confirmDetailsLink });
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.noRadioOption,
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
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.yesRadioOption);
    await performAction('clickButton', 'Save and continue');
    await performAction('taskList', { subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink });
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
      radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction('clickButton', 'Save and continue');
    await performAction('taskList', { subSection: taskList.householdAndCircumstancesLink });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.yesRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.yesRadioOption,
    });
    await performAction('clickButton', 'Save and continue');
    await performAction('taskList', { subSection: taskList.incomeAndExpensesLink });
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
    await performAction('selectPriorityDebts', {
      question: priorityDebts.doYouHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.yesRadioOption,
    });
    await performAction('enterPriorityDebtDetails', {
      totalAmount: priorityDebtDetails.totalAmountTextInput,
      payAmount: priorityDebtDetails.amountYouPayTextInput,
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetails.monthRadioOption,
    });
    await performAction('selectWhatOtherRegularExpensesDoYouHave', {
      regularIncomeOptions: [
        [
          whatOtherRegularExpensesDoYouHave.groceryShoppingParagraph,
          whatOtherRegularExpensesDoYouHave.groceryShoppingTotalAmountInput,
          whatOtherRegularExpensesDoYouHave.groceryShoppingWeekHiddenRadioOption,
        ],
        [
          whatOtherRegularExpensesDoYouHave.loanPaymentsParagraph,
          whatOtherRegularExpensesDoYouHave.loanPaymentsTotalAmountInput,
          whatOtherRegularExpensesDoYouHave.loanPaymentsMonthHiddenRadioOption,
        ],
      ],
    });
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.yesRadioOption,
      courtInfo: otherConsiderations.detailsTextInput,
    });
    await performAction('clickButton', 'Save and continue');
    await performAction('taskList', { subSection: taskList.uploadDocumentsLink });
    await performAction('uploadFiles');
    await performAction('clickButton', 'Save and continue');
    await performAction('taskListStatus', {
      subSecArray: [
        taskList.readInformationAboutLink,
        taskList.respondToSpecificPartsOfClaimantsClaimLink,
        taskList.incomeAndExpensesLink,
        taskList.uploadDocumentsLink,
        taskList.confirmDetailsLink,
      ],
      status: 'Done',
    });
    await performAction('taskListStatus', {
      subSecArray: [taskList.checkYourAnswersAndSubmitHiddenLink],
      status: 'Available',
    });
    await performAction('taskList', { subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performAction('clickRadioButton', tenancyTypeDetails.yesRadioOption);
    await performAction('clickButton', tenancyTypeDetails.saveForLaterButton);
    await performAction('taskList', { subSection: taskList.householdAndCircumstancesLink });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('clickRadioButton', doYouHaveAnyDependantChildren.noRadioOption);
    await performAction('clickButton', doYouHaveAnyDependantChildren.saveForLaterButton);
    await performAction('taskListStatus', {
      subSecArray: [taskList.householdAndCircumstancesLink, taskList.respondToSpecificPartsOfClaimantsClaimLink],
      status: 'In progress',
    });
  });
});
