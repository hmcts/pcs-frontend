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
  counterClaimUploadDocuments,
  counterClaimWhatAreYouClaimingFor,
  defendantDateOfBirth,
  defendantNameCapture,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
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
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { getRelativeDate } from '../utils/common/string.utils';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction } from '../utils/controller';

const home_url = process.env.TEST_URL;
let claimantName: string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  claimantName = submitCaseApiData.submitCasePayload.claimantName;
  process.env.CLAIMANT_NAME = claimantName;
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }

  //paymentInterstitial back navigation
  if (testInfo.title.includes('CounterClaimFee - INeedHelp')) {
    process.env.I_NEED_HELP = 'YES';
  } else {
    process.env.I_NEED_HELP = 'NO';
  }

  if (testInfo.title.includes('@rentNonRent')) {
    process.env.TENANCY_START_DATE_KNOWN = 'YES';
    process.env.RENT_NON_RENT = 'YES';
  } else {
    process.env.RENT_NON_RENT = 'NO';
  }

  if (testInfo.title.includes('SelectCounterClaim - No')) {
    process.env.SELECT_COUNTER_CLAIM = 'NO';
  } else {
    process.env.SELECT_COUNTER_CLAIM = 'YES';
  }

  const isRentArrearsOnly =
    testInfo.title.includes('RentArrears') &&
    !testInfo.title.includes('NonRentArrears') &&
    !testInfo.title.includes('Respond to a claim');

  process.env.RENT_ARREARS = isRentArrearsOnly ? 'YES' : 'NO';

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
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.TENANCY_START_DATE_KNOWN = testInfo.title.includes('Respond to a claim') ? 'NO' : 'YES';
    process.env.RENT_NON_RENT = 'NO';
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

  //Check if Yes is selected on Priority debts page - for back link navigation of Priority debt details page
  if (testInfo.title.includes('PriorityDebts - Yes')) {
    process.env.PRIORITY_DEBTS = 'YES';
  }
  //Check if Universal Credit is selected on Regular income page - for back link navigation of Priority Debts page
  if (testInfo.title.includes('RegularIncome - Universal Credit')) {
    process.env.REGULAR_INCOME = 'UNIVERSAL_CREDIT';
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
  } else if (testInfo.title.includes('@multiParty')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadDefault });
    claimantName = submitCaseApiData.submitCasePayloadDefault.overriddenClaimantName;
    process.env.CLAIMANT_NAME = claimantName;
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
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  //Income and expenses - yes - Only Universal CREDIT - Priority debt
  test('Respond to a claim @noDefendants @regression @crossbrowser', async () => {
    //Counterclaim - yes - What are you claiming for - sum of money - Select counterclaim fee - I do not need help
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
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
    await performAction('clickButton', counterClaimUploadDocuments.continueButton);
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
  });
});
