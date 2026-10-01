import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  adjustmentToGetIntoBuilding,
  askYourSolicitorToRespond,
  bringSupportToCourtHearing,
  checkYourAnswersRTC,
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimAgainstWhom,
  counterClaimApplicationFeeAmount,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimOrderOtherThanSum,
  counterClaimPaymentSuccessful,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  counterclaimYouNeedToApplyForHelpWithYourFees,
  dashboard,
  defendantDateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
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
  feelComfortableDuringHearing,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  helpWithForms,
  helpcommunicatingAndUnderstanding,
  howMuchAffordToPay,
  incomeAndExpenses,
  installmentPayments,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  paymentDetails,
  physicalMentalOrLearningDisability,
  priorityDebtDetails,
  priorityDebts,
  reasonableAdjustmentsTriage,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  requestCertainTypeOfHearing,
  responseSubmitted,
  responseSubmittedCounterclaimFeePaymentNeeded,
  reviewSupport,
  startNow,
  supportRequest,
  supportRequestNotSent,
  taskList,
  tenancyDateDetails,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
  yourHouseholdAndCircumstances,
} from '../data/page-data';
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { getRelativeDate } from '../utils/common/date.utils';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import {
  finaliseAllValidations,
  initializeExecutor,
  performAction,
  performActions,
  performValidation,
  performValidations,
} from '../utils/controller';
const home_url = process.env.TEST_URL;
let claimantName: string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-enabled');
  await performAction('resetRTCAnswerStore');
  claimantName = submitCaseApiData.submitCasePayload.claimantName;
  process.env.CLAIMANT_NAME = claimantName;
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }

  if (testInfo.title.includes('@rentNonRent')) {
    process.env.TENANCY_START_DATE_KNOWN = 'YES';
    process.env.RENT_NON_RENT = 'YES';
  } else {
    process.env.RENT_NON_RENT = 'NO';
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
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  } else if (testInfo.title.includes('@secureFlexible')) {
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy });
  } else if (testInfo.title.includes('@other')) {
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
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
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
  } else if (testInfo.title.includes('@secureFlexibleNoticeServedNo')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', {
      data: submitCaseApiData.submitCasePayloadSecureFlexibleTenancyNoticeServedNo,
    });
  } else {
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  }
  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS);
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
//@noDefendants(submitCasePayloadNoDefendants) represents all defendant details unknown pages and non-rent arrears
//All defendant details known pages and Rent-arrears routing is covered in submitCasePayload
//Mix and match of testcases needs to updated in e2etests once complete routing is implemented. ex: (Tendency type HDPI-3316 etc.)
test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  // Counterclaim - yes - What are you claiming for - sum of money - Select counterclaim fee - I do not need help
  test('Respond to a claim - RegularIncome - Universal Credit - SelectCounterClaim - Yes @noDefendants @crossbrowser @WIP', async () => {
    await performActions(
      'Respond to a claim - step group 1',
      ['When the user selects the legal advice option', freeLegalAdvice.yesRadioOption],
      ['And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption],
      ['And the user retrieves the check‑your‑answers table data for the RTC section', 'startNowAndDetails'],
      ['Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails'],
      ['When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton],
      ['And the user navigates to the task list subsection', { subSection: taskList.confirmDetailsLink }]
    );
    await performValidation('Then the user sees the main header', defendantNameCapture.mainHeader);
    await performActions(
      'Respond to a claim - step group 2',
      [
        'When the user enters the defendant details',
        { fName: defendantNameCapture.firstNameTextInput, lName: defendantNameCapture.lastNameTextInput },
      ],
      [
        'And the user enters the date of birth details',
        {
          dobDay: defendantDateOfBirth.dayInputText,
          dobMonth: defendantDateOfBirth.monthInputText,
          dobYear: defendantDateOfBirth.yearInputText,
        },
      ],
      [
        'And the user selects whether the correspondence address is known',
        { radioOption: correspondenceAddress.yesRadioOption },
      ],
      [
        'And the user selects the contact preference (email or post)',
        {
          question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
          radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
          emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
        },
      ],
      [
        'And the user selects contact by telephone',
        {
          radioOption: contactPreferencesTelephone.yesRadioOption,
          phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
        },
      ],
      [
        'selectContactByTextMessage',
        {
          radioOption: contactPreferencesTextMessage.yesRadioOption,
          mobileNumber: contactPreferencesTextMessage.ukMobileNumberTextInput,
        },
      ],
      ['And the user retrieves the check‑your‑answers table data for the RTC section', 'personalDetails'],
      ['Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails'],
      ['When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton],
      [
        'And the user navigates to the task list subsection',
        { subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink },
      ],
      [
        'When the user responds to the dispute claim interstitial',
        submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect,
      ],
      [
        'And the user enters the tenancy or contract type details',
        {
          tenancyType: submitCaseApiData.submitCasePayloadNoDefendants.tenancy_TypeOfTenancyLicence,
          tenancyOption: tenancyTypeDetails.yesRadioOption,
        },
      ],
      ['And the user enters the tenancy start details when unknown', { tsDay: '15', tsMonth: '11', tsYear: '2024' }]
    );

    await performValidation('Then the user sees the main header', yourHouseholdAndCircumstances.mainHeader);

    await performActions(
      'Respond to a claim - step group 3',
      ['readYourHouseholdAndCircumstances'],
      [
        'doYouHaveAnyDependantChildren',
        {
          dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
          dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
        },
      ],
      ['doYouHaveAnyOtherDependants', { otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption }],
      [
        'selectIfAnyOtherAdultsLiveInYourHouse',
        {
          radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
          details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
        },
      ],
      [
        'selectAlternativeAccommodation',
        { radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption, ...getRelativeDate(5) },
      ],
      [
        'yourCircumstances',
        {
          question: yourCircumstances.wouldYouLikeToShareHeader,
          yourCircumstancesOption: yourCircumstances.yesRadioOption,
        },
      ],
      [
        'exceptionalHardship',
        { question: exceptionalHardship.mainHeader, exceptionalHardshipOption: exceptionalHardship.yesRadioOption },
      ],
      ['And the user retrieves the check‑your‑answers table data for the RTC section', 'situationAndCircumstances'],
      ['Then the user validates the RTC section on the check‑your‑answers page', 'situationAndCircumstances'],
      ['When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton],
      ['And the user navigates to the task list subsection', { subSection: taskList.incomeAndExpensesLink }]
    );

    await performValidation('Then the user sees the main header', incomeAndExpenses.mainHeader);

    await performActions(
      'Respond to a claim - step group 4',
      ['selectIncomeAndExpenses', { incomeAndExpensesOption: incomeAndExpenses.yesRadioOption }],
      [
        'selectWhatRegularIncomeDoYouReceive',
        {
          regularIncomeOptions: [
            [
              whatRegularIncomeDoYouReceive.universalCreditParagraph,
              whatRegularIncomeDoYouReceive.universalCreditTextInput,
              whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
            ],
          ],
        },
      ],
      [
        'selectPriorityDebts',
        { question: priorityDebts.doYouHaveAnyPriorityDebtsQuestion, option: priorityDebts.yesRadioOption },
      ],
      [
        'enterPriorityDebtDetails',
        {
          totalAmount: priorityDebtDetails.totalAmountTextInput,
          payAmount: priorityDebtDetails.amountYouPayTextInput,
          question: priorityDebtDetails.paidEveryParagraph,
          option: priorityDebtDetails.monthRadioOption,
        },
      ],
      [
        'selectWhatOtherRegularExpensesDoYouHave',
        {
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
        },
      ],
      [
        'otherConsiderations',
        {
          question: otherConsiderations.mainHeader,
          option: otherConsiderations.yesRadioOption,
          courtInfo: otherConsiderations.detailsTextInput,
        },
      ],
      ['And the user retrieves the check‑your‑answers table data for the RTC section', 'incomeAndExpenditure'],
      ['Then the user validates the RTC section on the check‑your‑answers page', 'incomeAndExpenditure'],
      ['When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton],
      ['And the user navigates to the task list subsection', { subSection: taskList.uploadDocumentsLink }],
      ['uploadFiles'],
      ['And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles'],
      ['Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles'],
      ['When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton],
      [
        'taskListStatus',
        {
          subSecArray: [
            taskList.readInformationAboutLink,
            taskList.respondToSpecificPartsOfClaimantsClaimLink,
            taskList.incomeAndExpensesLink,
            taskList.uploadDocumentsLink,
            taskList.confirmDetailsLink,
          ],
          status: 'Done',
        },
      ],
      ['And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink }]
    );

    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);

    await performActions(
      'Respond to a claim - step group 5',
      ['When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton],
      [
        'And the user navigates to the task list subsection',
        { subSection: taskList.checkYourAnswersAndSubmitHiddenLink },
      ]
    );

    await performValidation('Then the user sees the main header', equalityAndDiversityStart.mainHeader);

    await performActions(
      'Respond to a claim - step group 6',
      ['When the user clicks the button', equalityAndDiversityStart.idontWantToAnswerQuestions],
      ['languageUsed', { question: languageUsed.mainHeader, radioOption: languageUsed.englishRadioOption }],
      [
        'selectStatementOfTruthRTC',
        {
          options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
          input: checkYourAnswersRTC.yourFullNameTextInput,
        },
      ],
      ['clickLink', responseSubmittedCounterclaimFeePaymentNeeded.payYourCounterclaimFeeLink],
      [
        'validateCounterClaimApplicationFee',
        {
          amount: `£${counterClaimSpecificSumOfMoney.claimInput}`,
          fee: counterClaimSpecificSumOfMoney.feeHiddenAmount,
        },
      ],
      ['When the user clicks the button', counterClaimApplicationFeeAmount.getPayButton('35.00')]
    );

    await performValidation('Then the user sees the main header', paymentDetails.mainHeader);

    await performActions(
      'Respond to a claim - step group 7',
      ['inputCounterClaimPaymentDetails', { cardNumber: paymentDetails.validCardNumber }],
      ['When the user clicks the button', paymentDetails.confirmPaymentButton]
    );

    await performValidations(
      'Respond to a claim - validation group',
      ['Then the user sees the main header', counterClaimPaymentSuccessful.mainHeader],
      ['text', { elementType: 'paragraph', text: counterClaimPaymentSuccessful.paymentConfirmationParagraph }]
    );

    await performActions('Respond to a claim - step group 8', [
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton,
    ]);

    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('Respond to a claim - Solicitor journey returns to task list when Yes is selected for Do you have a solicitor? @noDefendants @crossbrowser @regression', async () => {
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.yesRadioOption);
    await performValidation('Then the user sees the main header', askYourSolicitorToRespond.mainHeader);
    await performAction('When the user clicks the button', askYourSolicitorToRespond.closeAndReturnToTaskListButton);
    await performValidation('Then the user sees the main header', taskList.mainHeader);
  });

  test('NonRentArrears - Assured- NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown - Income - no - SelectCounterClaim - Yes @assured', async () => {
    //incomeAndExpenses - no - Upload docs - Multiple named party - Both - No - iDoNotNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
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
      options: [contactPreferenceEmailOrPost.byEmailCheckbox, contactPreferenceEmailOrPost.byPostCheckbox],
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadAssuredTenancy.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('And the user enters the tenancy start details when unknown');
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
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles', { files: ['rentArrears.pdf'] });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('NonRentArrears - Assured- NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown - CounterClaimAppliedForHelp - No - SelectCounterClaim - Yes @assured', async () => {
    // > 3 named parties - CounterClaimAppliedForHelp - No - You need to apply for help with your fees
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
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
      options: [contactPreferenceEmailOrPost.byEmailCheckbox, contactPreferenceEmailOrPost.byPostCheckbox],
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadAssuredTenancy.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('And the user enters the tenancy start details when unknown');
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
      option: counterClaimWhatAreYouClaimingFor.bothRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoney', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('counterClaimHaveYouAppliedForHelpWithFee', {
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.noRadioOption,
    });
    await performValidation(
      'Then the user sees the main header',
      counterclaimYouNeedToApplyForHelpWithYourFees.mainHeader
    );
  });

  test('NonRentArrears - Secure - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known - SomethingElse - SelectCounterClaim - Yes @secureFlexible', async () => {
    //Income and expenses - yes - no option On regular Income - universal credit, no defendants - Counterclaim - yes - SomethingElse -  I need help
    await performAction('When the user selects the legal advice option', freeLegalAdvice.noRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('When the user enters the defendant details', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('And the user enters the date of birth details');
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
      showTenancyDocumentLink: true,
    });
    await performAction('And the user enters the tenancy start details when unknown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown', {
      showNoticeDocumentLink: true,
      noticeMethodPayload: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy,
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
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('counterClaimOrderOtherThanSum', {
      ordersInput: counterClaimOrderOtherThanSum.whatOrdersInput,
      factsInput: counterClaimOrderOtherThanSum.whatFactsInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
    await performAction('selectWhatOtherRegularExpensesDoYouHave');
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('NonRentArrears - Flexible - NoticeServed - Yes NoticeDateProvided - No - NoticeDetails - Im not sure - NonRentArrearsDispute - CounterClaimFee - INeedHelp - SelectCounterClaim - Yes @secureFlexible @regression @PR', async () => {
    //Income and expenses - yes - all options except Universal Credit - universal credit - What are you claiming for - sum of money - I need help
    await performAction('When the user selects the legal advice option', freeLegalAdvice.preferNotToSayRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
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
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
      showTenancyDocumentLink: true,
    });
    await performAction('And the user enters the tenancy start details when unknown');
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.imNotSureRadioOption,
    });
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.yesRadioOption,
      disputeInfo: nonRentArrearsDispute.explainClaimTextInput,
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
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
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
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.incomeAndExpensesLink,
    });
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
          whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
          whatRegularIncomeDoYouReceive.pensionTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
          whatRegularIncomeDoYouReceive.incomeFromJobsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
          whatRegularIncomeDoYouReceive.detailsAboutOtherSourcesOfIncomeTextInput,
        ],
      ],
    });
    await performAction('selectUniversalCredit', {
      question: haveYouAppliedForUniversalCredit.mainHeader,
      creditRadioOption: haveYouAppliedForUniversalCredit.yesRadioOption,
      ...getRelativeDate(-5),
    });
    await performAction('selectPriorityDebts', {
      question: priorityDebts.doYouHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.noRadioOption,
    });
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
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('England - Flexible - NonRentArrears - NoticeServed - No NoticeDateProvided - No - NonRentArrearsDispute - CounterClaimFee - INeedHelp - SelectCounterClaim - Yes @secureFlexibleNoticeServedNo', async () => {
    //Counterclaim - both - I need help
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
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
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial', //
      submitCaseApiData.submitCasePayloadSecureFlexibleTenancyNoticeServedNo.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancyNoticeServedNo.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
      showTenancyDocumentLink: true,
    });
    await performAction('And the user enters the tenancy start details when unknown');
    await performValidation('Then the user sees the main header', nonRentArrearsDispute.mainHeader);
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
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
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
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('RentArrears - Introductory - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown - RegularIncome - Universal Credit - CounterClaimFee - INeedHelp - SelectCounterClaim - Yes @regression', async () => {
    //universal credit with all other options - priority debts - No - Multiple namedParties - sumOfMoney - iNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.noRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayload.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
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
      showRentDocumentLink: true,
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
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueFEE0508Input,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueFEE0508Input,
    });
    await performAction('counterClaimHaveYouAppliedForHelpWithFee', {
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    const pin2User = await getPinUserAt(1);
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName, `${pin2User.firstName} ${pin2User.lastName}`],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.noRadioOption,
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.incomeAndExpensesLink,
    });
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
          whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.universalCreditParagraph,
          whatRegularIncomeDoYouReceive.universalCreditTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
          whatRegularIncomeDoYouReceive.pensionTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
          whatRegularIncomeDoYouReceive.incomeFromJobsTextInput,
          whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
        ],
        [
          whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
          whatRegularIncomeDoYouReceive.detailsAboutOtherSourcesOfIncomeTextInput,
        ],
      ],
    });
    await performAction('selectPriorityDebts', {
      question: priorityDebts.doYouHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.noRadioOption,
    });
    await performAction('selectWhatOtherRegularExpensesDoYouHave');
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('RentArrears - Demoted - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known - InstallmentPayment - No - PriorityDebts - Yes - SelectCounterClaim - Yes @smoke @PR @healthCheck', async () => {
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayload.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
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
      showNoticeDocumentLink: true,
      noticeMethodPayload: submitCaseApiData.submitCasePayload,
    });
    await performAction('rentArrears', {
      option: rentArrears.noRadioOption,
      rentAmount: rentArrears.rentAmountTextInput,
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
    const pin2User = await getPinUserAt(1);
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName, `${pin2User.firstName} ${pin2User.lastName}`],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      question: repaymentsAgreed.getMainHeader(claimantName),
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
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
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
      exceptionalHardshipOption: exceptionalHardship.yesRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
      creditRadioOption: haveYouAppliedForUniversalCredit.yesRadioOption,
      ...getRelativeDate(-3),
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
    await performAction('selectWhatOtherRegularExpensesDoYouHave');
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('RentArrears - Demoted - NoticeServed - Yes - NoticeDateProvided - Yes NoticeDetails - No - RentArrearsDispute - SomethingElse - SelectCounterClaim - Yes', async () => {
    //somethingElse - multiple named parties - iDoNotNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayload.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
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
    await performAction('selectCounterClaim', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingFor', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('counterClaimOrderOtherThanSum', {
      ordersInput: counterClaimOrderOtherThanSum.whatOrdersInput,
      factsInput: counterClaimOrderOtherThanSum.whatFactsInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.yesRadioOption,
    });
    await performAction('selectHowMuchAffordToPay', {
      affordToPay: howMuchAffordToPay.affordToPayTextInput,
      question: howMuchAffordToPay.howFrequentlyCouldYouAffordToPayQuestion,
      radioOption: howMuchAffordToPay.weeklyRadioOption,
    });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'payments');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'payments');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.householdAndCircumstancesLink,
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
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.yesRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
      option: priorityDebts.noRadioOption,
    });
    await performAction('selectWhatOtherRegularExpensesDoYouHave');
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('England - RentArrears - NonRentArrears - NoticeServed - No - RentArrearsDispute - SelectCounterClaim - No @PR @rentNonRent @regression', async () => {
    //> 3 named parties - CounterClaimAppliedForHelp - Yes - Who are you claiming against
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('And the user enters the date of birth details', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('And the user selects whether the correspondence address is known', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('And the user selects the contact preference (email or post)', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadRentNonRent.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
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
    await performAction('selectCounterClaim', {
      option: counterClaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
      option: priorityDebts.noRadioOption,
    });
    await performAction('selectWhatOtherRegularExpensesDoYouHave');
    await performAction('otherConsiderations', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction('When the user clicks the button', responseSubmitted.closeAndReturnToCaseOverviewButton);
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('England - RentArrears - NonRentArrears - NoticeServed - No - RentArrearsDispute - SelectCounterClaim - yes - @multiParty', async () => {
    // Multiparty - Unknown defendant details - somethingElse - iDoNotNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
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
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadDefault.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadDefault.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.imNotSureRadioOption,
    });
    await performAction('And the user enters the tenancy start details when unknown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
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
      option: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('selectCounterClaimFee', {
      radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    const pin2User = await getPinUserAt(1);
    const firstName = pin2User.firstName ?? submitCaseApiData.submitCasePayloadDefault.defendant1.firstName;
    const lastName = pin2User.lastName ?? submitCaseApiData.submitCasePayloadDefault.defendant1.lastName;
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName, `${firstName} ${lastName}`],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('counterClaimOrderOtherThanSum', {
      ordersInput: counterClaimOrderOtherThanSum.whatOrdersInput,
      factsInput: counterClaimOrderOtherThanSum.whatFactsInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'disputeAndTenancy');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.declareRecentPaymentsHiddenLink,
    });
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.yesRadioOption,
      repaymentInfo: repaymentsMade.detailsTextInput,
    });
    await performAction('repaymentsAgreed', {
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles');
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.iDoNotWantToAnswerButton);
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
    await performAction('clickLink', responseSubmittedCounterclaimFeePaymentNeeded.payYourCounterclaimFeeLink);
    await performAction('validateCounterClaimApplicationFee', {
      amount: counterClaimApplicationFeeAmount.counterClaimAmountNotApplicable,
      fee: counterClaimApplicationFeeAmount.somethingElseCounterClaimFee,
    });
    await performAction(
      'When the user clicks the button',
      counterClaimApplicationFeeAmount.getPayButton(counterClaimApplicationFeeAmount.somethingElseCounterClaimFee)
    );
    await performValidation('Then the user sees the main header', paymentDetails.mainHeader);
    await performAction('inputCounterClaimPaymentDetails', { cardNumber: paymentDetails.declinedCardNumber });
    await performValidation('Then the user sees the main header', 'Your payment has been declined');
    await performAction('When the user clicks the button', paymentDetails.startDynamicButton);
    await performValidation('errorMessage', {
      message: counterClaimApplicationFeeAmount.paymentFailedDynamicErrorMessage,
    });
  });
});

test.describe('Common Component Your Support and PCQ Respond to a claim - e2e Journey @nightly ', async () => {
  test('YourSupport Request Sent To Court And PCQ NonRentArrears- Assured- NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown - Income - no - SelectCounterClaim - Yes @regression @assured @nightly', async () => {
    //incomeAndExpenses - no - Upload docs - Multiple named party - Both - No - iDoNotNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
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
      options: [contactPreferenceEmailOrPost.byEmailCheckbox, contactPreferenceEmailOrPost.byPostCheckbox],
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadAssuredTenancy.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('And the user enters the tenancy start details when unknown');
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
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles', { files: ['rentArrears.pdf'] });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
      options: [
        adjustmentToGetIntoBuilding.accessibleToiletCheckbox,
        adjustmentToGetIntoBuilding.helpUsingALiftCheckbox,
        adjustmentToGetIntoBuilding.useOfVenueWheelchairCheckbox,
      ],
      button: adjustmentToGetIntoBuilding.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: documentInAlternativeFormat.mainHeader,
      options: [
        documentInAlternativeFormat.audioTranslationOfDocumentsCheckbox,
        documentInAlternativeFormat.brailleDocumentsCheckbox,
        documentInAlternativeFormat.informationEmailedToMeCheckbox,
      ],
      button: documentInAlternativeFormat.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: helpcommunicatingAndUnderstanding.mainHeader,
      options: [
        helpcommunicatingAndUnderstanding.extraTimeToThinkAndExplainMyselfCheckbox,
        helpcommunicatingAndUnderstanding.needToBeCloseToWhoIsSpeakingCheckbox,
      ],
      button: helpcommunicatingAndUnderstanding.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: helpWithForms.mainHeader,
      options: [helpWithForms.noHelpWithFormsCheckbox],
      button: helpWithForms.continueButton,
    });
    await performAction('selectReasonableAdjustments', {
      header: feelComfortableDuringHearing.mainHeader,
      options: [
        feelComfortableDuringHearing.privateWaitingAreaCheckbox,
        feelComfortableDuringHearing.regularBreaksCheckbox,
      ],
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
    await performValidation(
      'Then the user sees the main header',
      equalityAndDiversityMarriedOrCivilPartnership.mainHeader
    );
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
    await performValidation(
      'Then the user sees the main header',
      equalityAndDiversityAbilityToCarryOutActivity.mainHeader
    );
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityAbilityToCarryOutActivity.mainHeader,
      radioOption: equalityAndDiversityAbilityToCarryOutActivity.notAtAllRadioOption,
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
    await performAction('selectStatementOfTruthRTC', {
      options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
      input: checkYourAnswersRTC.yourFullNameTextInput,
    });
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });

  test('YourSupport Request NOT Sent To Court NonRentArrears- Assured- NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown - Income - no - SelectCounterClaim - Yes @regression @assured @nightly', async () => {
    //incomeAndExpenses - no - Upload docs - Multiple named party - Both - No - iDoNotNeedHelp
    await performAction('When the user selects the legal advice option', freeLegalAdvice.yesRadioOption);
    await performAction('And the user selects whether they have a solicitor', doYouHaveASolicitor.noRadioOption);
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'startNowAndDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'startNowAndDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.confirmDetailsLink,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
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
      options: [contactPreferenceEmailOrPost.byEmailCheckbox, contactPreferenceEmailOrPost.byPostCheckbox],
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('And the user selects contact by telephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', {
      radioOption: contactPreferencesTextMessage.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'personalDetails'
    );
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'personalDetails');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink,
    });
    await performAction(
      'When the user responds to the dispute claim interstitial',
      submitCaseApiData.submitCasePayloadAssuredTenancy.isClaimantNameCorrect
    );
    await performAction('And the user enters the tenancy or contract type details', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('And the user enters the tenancy start details when unknown');
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
    await performAction('selectClaimAgainstWhom', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName],
    });
    await performAction('counterClaimAbout', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFiles', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'disputeAndTenancy'
    );
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
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'situationAndCircumstances'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'situationAndCircumstances'
    );
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
    await performAction(
      'And the user retrieves the check‑your‑answers table data for the RTC section',
      'incomeAndExpenditure'
    );
    await performAction(
      'Then the user validates the RTC section on the check‑your‑answers page',
      'incomeAndExpenditure'
    );
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
    await performAction('And the user navigates to the task list subsection', {
      subSection: taskList.uploadDocumentsLink,
    });
    await performAction('uploadFiles', { files: ['rentArrears.pdf'] });
    await performAction('And the user retrieves the check‑your‑answers table data for the RTC section', 'uploadFiles');
    await performAction('Then the user validates the RTC section on the check‑your‑answers page', 'uploadFiles');
    await performAction('When the user clicks the button', checkYourAnswersRTC.saveAndContinueButton);
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
    //
    await performAction('And the user navigates to the task list subsection', { subSection: taskList.yourSupportLink });
    await performValidation('Then the user sees the main header', reasonableAdjustmentsTriage.mainHeader);
    await performAction('When the user clicks the button', reasonableAdjustmentsTriage.continueToQuestionsButton);
    await performAction('selectReasonableAdjustments', {
      header: physicalMentalOrLearningDisability.mainHeader,
      options: [
        physicalMentalOrLearningDisability.bringSupportCheckbox,
        physicalMentalOrLearningDisability.askCertainTypeOfHearingCheckbox,
      ],
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
      radioOption: equalityAndDiversityLanguage.preferNotToSayRadioOption,
      button: equalityAndDiversityLanguage.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityYourSex.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityYourSex.mainHeader,
      radioOption: equalityAndDiversityYourSex.preferNotToSayRadioOption,
      button: equalityAndDiversityYourSex.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversitySameGender.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversitySameGender.mainHeader,
      radioOption: equalityAndDiversitySameGender.preferNotToSayRadioOption,
      button: equalityAndDiversitySameGender.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityHowYouThink.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityHowYouThink.mainHeader,
      radioOption: equalityAndDiversityHowYouThink.preferNotToSayRadioOption,
      button: equalityAndDiversityHowYouThink.ContinueButton,
    });
    await performValidation(
      'Then the user sees the main header',
      equalityAndDiversityMarriedOrCivilPartnership.mainHeader
    );
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
      radioOption: equalityAndDiversityReligion.preferNotToSayRadioOption,
      button: equalityAndDiversityReligion.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityHealthCondiotion.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityHealthCondiotion.mainHeader,
      radioOption: equalityAndDiversityHealthCondiotion.preferNotToSayRadioOption,
      button: equalityAndDiversityHealthCondiotion.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityPregnancy.mainHeader);
    await performAction('selectEqualityAndDiversity', {
      question: equalityAndDiversityPregnancy.mainHeader,
      radioOption: equalityAndDiversityPregnancy.preferNotToSayRadioOption,
      button: equalityAndDiversityPregnancy.ContinueButton,
    });
    await performValidation('Then the user sees the main header', equalityAndDiversityEnd.mainHeader);
    await performAction('When the user clicks the button', equalityAndDiversityEnd.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('selectStatementOfTruthRTC', {
      options: [checkYourAnswersRTC.contemptOfCourtCheckboxLabel, checkYourAnswersRTC.factsTrueCheckboxLabel],
      input: checkYourAnswersRTC.yourFullNameTextInput,
    });
    await performAction(
      'When the user clicks the button',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });
});
