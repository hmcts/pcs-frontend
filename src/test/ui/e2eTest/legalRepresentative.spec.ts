import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { repaymentsAgreed } from '../data/page-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPostLR,
  contactPreferencesTelephoneLR,
  contactPreferencesTextMessageLR,
  correspondenceAddressLR,
  counterClaimLR,
  defendantDateOfBirthLR,
  defendantNameConfirmationLR,
  doAnyOtherAdultsLiveInYourHomeLR,
  doYouHaveAnyDependantChildrenLR,
  doYouHaveAnyOtherDependantsLR,
  equalityAndDiversityEndLR,
  equalityAndDiversityStartLR,
  exceptionalHardshipLR,
  haveYouAppliedForUniversalCreditLR,
  incomeAndExpensesLR,
  instalmentPaymentsLR,
  languageUsedLR,
  nonRentArrearsDisputeLR,
  otherConsiderationsLR,
  previousPaymentsLR,
  priorityDebtDetailsLR,
  priorityDebtsLR,
  rentArrearsLR,
  repaymentsAgreedLR,
  selectDefendantLR,
  startNowLR,
  tenancyTypeDetailsLR,
  whatOtherRegularExpensesDoYouHaveLR,
  whatRegularIncomeDoYouReceiveLR,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR,
  yourCircumstancesLR,
} from '../data/page-data/lr-page-data';
import { user } from '../data/user-data';
import { getPinUserAt } from '../utils/actions/custom-actions';
import { getRelativeDate } from '../utils/common/date.utils';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;
let claimantName: string;
test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-lr-enabled');
  process.env.NOTICE_SERVED = 'YES';
  if (testInfo.title.includes('@nonRent')) {
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadAssuredTenancy.claimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    process.env.TENANCY_TYPE = 'ASSURED_TENANCY';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  } else if (testInfo.title.includes('@rentNonRent')) {
    claimantName = submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown });
  } else if (testInfo.title.includes('@rent')) {
    claimantName = submitCaseApiData.submitCaseRentDemotedCorrespondenceAddressUnknown.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCaseRentDemotedCorrespondenceAddressUnknown });
  }

  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('getCaseAPI');
  //await performAction('navigateToUrl', home_url);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor.email);
  //await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNowLR.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

//Skipping these tests temporarily in @nightly as LR feature will be toggled off in all test environments until the first release HDPI-7531
//selectNoticeDetails= defendant not sure, repaymentsAgreed - no - InstalmentPayments - Yes, Instalments
test.describe('Respond to a claim LR - e2e Journey @nightly', async () => {
  test('NonRentArrears - AssuredTenancy - LR @smoke @regression @nonRent @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendantLR.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmationLR.mainHeader(pin2User.firstName, pin2User.lastName),
      option: defendantNameConfirmationLR.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirthLR.dayInputText,
      dobMonth: defendantDateOfBirthLR.monthInputText,
      dobYear: defendantDateOfBirthLR.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddressLR.walesAddressLine1TextInput,
      townOrCity: correspondenceAddressLR.walesTownOrCityTextInput,
      postcode: correspondenceAddressLR.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPostLR.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPostLR.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPostLR.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephoneLR.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetailsLR.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnownLR', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknownLR');
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDisputeLR.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaimLR.yesRadioOption,
    });
    // await performAction('selectWhatAreYouClaimingFor', {
    //   question: counterClaimWhatAreYouClaimingFor.mainHeader,
    //   option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    // });
    // await performAction('counterClaimSpecificSumOfMoney', {
    //   question: counterClaimSpecificSumOfMoney.mainHeader,
    //   option: counterClaimSpecificSumOfMoney.yesRadioOption,
    //   amount: counterClaimSpecificSumOfMoney.claimInput,
    // });
    // await performAction('selectCounterClaimFee', {
    //   radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
    //   typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    //   amount: counterClaimSpecificSumOfMoney.claimInput,
    // });
    // await performAction('counterClaimAbout', {
    //   counterClaimFor: counterClaimAbout.counterClaimForInput,
    //   reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    // });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildrenLR.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildrenLR.detailsTextInput,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependantsLR.noRadioOption,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHomeLR.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHomeLR.detailsAboutAdultsTextInput,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('circumstancesLR', {
      question: yourCircumstancesLR.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstancesLR.yesRadioOption,
    });
    await performAction('selectExceptionalHardshipLR', {
      question: exceptionalHardshipLR.mainHeader,
      exceptionalHardshipOption: exceptionalHardshipLR.yesRadioOption,
    });
    await performAction('selectIncomeAndExpensesLR', {
      incomeAndExpensesOption: incomeAndExpensesLR.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceiveLR.universalCreditParagraph,
          whatRegularIncomeDoYouReceiveLR.universalCreditTextInput,
          whatRegularIncomeDoYouReceiveLR.monthHiddenRadioOption,
        ],
      ],
    });
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebtsLR.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebtsLR.noRadioOption,
    });
    await performAction('selectExpensesLR', {
      regularExpensesOptions: [
        [
          whatOtherRegularExpensesDoYouHaveLR.groceryShoppingParagraph,
          whatOtherRegularExpensesDoYouHaveLR.groceryShoppingTotalAmountInput,
          whatOtherRegularExpensesDoYouHaveLR.groceryShoppingWeekHiddenRadioOption,
        ],
        [
          whatOtherRegularExpensesDoYouHaveLR.loanPaymentsParagraph,
          whatOtherRegularExpensesDoYouHaveLR.loanPaymentsTotalAmountInput,
          whatOtherRegularExpensesDoYouHaveLR.loanPaymentsMonthHiddenRadioOption,
        ],
      ],
    });
    await performAction('otherConsiderationsLR', {
      question: otherConsiderationsLR.isThereAnythingElseParagraph,
      option: otherConsiderationsLR.yesRadioOption,
      courtInfo: otherConsiderationsLR.detailsTextInput,
    });
    await performAction('uploadFiles');
    await performValidation('mainHeader', equalityAndDiversityStartLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityStartLR.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsed', {
      question: languageUsedLR.mainHeader,
      radioOption: languageUsedLR.englishRadioOption,
    });
    //await performAction('clickButton', 'Submit');
  });

  test('RentArrears - NonRentArrears - AssuredTenancy - LR @smoke @PR @regression @rentNonRent @LR', async () => {
    const pinUser = await getPinUserAt(0);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmationLR.mainHeader(pinUser.firstName, pinUser.lastName),
      option: defendantNameConfirmationLR.noRadioOption,
      fName: defendantNameConfirmationLR.firstNameInputText,
      lName: defendantNameConfirmationLR.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirthLR.dayInputText,
      dobMonth: defendantDateOfBirthLR.monthInputText,
      dobYear: defendantDateOfBirthLR.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnknownLR', {
      radioOption: correspondenceAddressLR.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPostLR.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPostLR.byPostCheckbox,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephoneLR.yesRadioOption,
      phoneNumber: contactPreferencesTelephoneLR.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessageLR.yesRadioOption);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetailsLR.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetailsLR.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyTypeDetailsLR.yesRadioOption,
    });
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnownLR', {
      day: '25',
      month: '2',
      year: '2020',
    });
    await performAction('rentArrearsLR', {
      option: rentArrearsLR.noRadioOption,
      rentAmount: rentArrearsLR.rentAmountTextInput,
      rentArrearsTotal: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.rentArrears_Total,
    });
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDisputeLR.yesRadioOption,
      disputeInfo: nonRentArrearsDisputeLR.explainClaimTextInput,
    });
    await performAction('selectCounterClaim', {
      option: counterClaimLR.yesRadioOption,
    });
    // await performAction('selectWhatAreYouClaimingFor', {
    //   question: counterClaimWhatAreYouClaimingFor.mainHeader,
    //   option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    // });
    // await performAction('counterClaimSpecificSumOfMoney', {
    //   question: counterClaimSpecificSumOfMoney.mainHeader,
    //   option: counterClaimSpecificSumOfMoney.yesRadioOption,
    //   amount: counterClaimSpecificSumOfMoney.claimInput,
    // });
    // await performAction('selectCounterClaimFee', {
    //   radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
    //   typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    //   amount: counterClaimSpecificSumOfMoney.claimInput,
    // });
    // const pin2User = await getPinUserAt(1);
    // await performAction('selectClaimAgainstWhom', {
    //   question: counterClaimAgainstWhom.mainHeader,
    //   options: [claimantName, `${pin2User.firstName} ${pin2User.lastName}`],
    // });
    // await performAction('counterClaimAbout', {
    //   counterClaimFor: counterClaimAbout.counterClaimForInput,
    //   reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    // });
    // await performAction('doYouWantToUploadFiles', {
    //   option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    // });
    await performAction('previousPaymentsLR', {
      question: previousPaymentsLR.getMainHeader(),
      repaymentOption: previousPaymentsLR.noRadioOption,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreedLR.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: instalmentPaymentsLR.wouldDefendantLikeToOfferToPayQuestion,
      radioOption: instalmentPaymentsLR.noRadioOption,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildrenLR.noRadioOption,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependantsLR.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependantsLR.detailsTextInput,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHomeLR.noRadioOption,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.defendantNotSureRadioOption,
    });
    await performAction('circumstancesLR', {
      question: yourCircumstancesLR.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstancesLR.noRadioOption,
    });
    await performAction('selectExceptionalHardshipLR', {
      question: exceptionalHardshipLR.mainHeader,
      exceptionalHardshipOption: exceptionalHardshipLR.noRadioOption,
    });
    await performAction('selectIncomeAndExpensesLR', {
      incomeAndExpensesOption: incomeAndExpensesLR.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR');
    await performAction('selectUniversalCreditLR', {
      question: haveYouAppliedForUniversalCreditLR.mainHeader,
      creditRadioOption: haveYouAppliedForUniversalCreditLR.yesRadioOption,
      ...getRelativeDate(-3),
    });
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebtsLR.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebtsLR.yesRadioOption,
    });
    await performAction('enterPriorityDebtDetailsLR', {
      totalAmount: priorityDebtDetailsLR.totalAmountTextInput,
      payAmount: priorityDebtDetailsLR.amountYouPayTextInput,
      question: priorityDebtDetailsLR.paidEveryParagraph,
      option: priorityDebtDetailsLR.weekRadioOption,
    });
    await performAction('selectExpensesLR');
    await performAction('otherConsiderationsLR', {
      question: otherConsiderationsLR.isThereAnythingElseParagraph,
      option: otherConsiderationsLR.noRadioOption,
    });
    await performAction('uploadFiles');
    await performValidation('mainHeader', equalityAndDiversityStartLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityStartLR.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsed', {
      question: languageUsedLR.mainHeader,
      radioOption: languageUsedLR.englishRadioOption,
    });
    //await performAction('clickButton', 'Submit');
  });

  test('RentArrears - DemotedTenancy - LR @smoke @regression @rent @LR', async () => {
    const pinUser = await getPinUserAt(0);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmationLR.mainHeader(pinUser.firstName, pinUser.lastName),
      option: defendantNameConfirmationLR.noRadioOption,
      fName: defendantNameConfirmationLR.firstNameInputText,
      lName: defendantNameConfirmationLR.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirthLR.dayInputText,
      dobMonth: defendantDateOfBirthLR.monthInputText,
      dobYear: defendantDateOfBirthLR.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnknownLR', {
      radioOption: correspondenceAddressLR.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPostLR.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPostLR.byPostCheckbox,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephoneLR.yesRadioOption,
      phoneNumber: contactPreferencesTelephoneLR.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessageLR.yesRadioOption);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCaseRentDemotedCorrespondenceAddressUnknown.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetailsLR.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetailsLR.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnownLR');
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.noRadioOption,
    });
    await performAction('rentArrearsLR', {
      option: rentArrearsLR.yesRadioOption,
      rentArrearsTotal: submitCaseApiData.submitCaseRentDemotedCorrespondenceAddressUnknown.rentArrears_Total,
    });
    await performAction('selectCounterClaim', {
      option: counterClaimLR.yesRadioOption,
    });
    // await performAction('selectWhatAreYouClaimingFor', {
    //   question: counterClaimWhatAreYouClaimingFor.mainHeader,
    //   option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    // });
    // await performAction('counterClaimSpecificSumOfMoney', {
    //   question: counterClaimSpecificSumOfMoney.mainHeader,
    //   option: counterClaimSpecificSumOfMoney.yesRadioOption,
    //   amount: counterClaimSpecificSumOfMoney.claimInput,
    // });
    // await performAction('selectCounterClaimFee', {
    //   radioOption: counterClaimFee.iDoNotNeedHelpRadioOption,
    //   typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    //   amount: counterClaimSpecificSumOfMoney.claimInput,
    // });
    // const pin2User = await getPinUserAt(1);
    // await performAction('selectClaimAgainstWhom', {
    //   question: counterClaimAgainstWhom.mainHeader,
    //   options: [claimantName, `${pin2User.firstName} ${pin2User.lastName}`],
    // });
    // await performAction('counterClaimAbout', {
    //   counterClaimFor: counterClaimAbout.counterClaimForInput,
    //   reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    // });
    // await performAction('doYouWantToUploadFiles', {
    //   option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    // });
    await performAction('previousPaymentsLR', {
      question: previousPaymentsLR.getMainHeader(),
      repaymentOption: previousPaymentsLR.yesRadioOption,
      repaymentInfo: previousPaymentsLR.detailsTextInput,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreedLR.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreedLR.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreedLR.detailsTextInput,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildrenLR.noRadioOption,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependantsLR.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependantsLR.detailsTextInput,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHomeLR.noRadioOption,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.noRadioOption,
    });
    await performAction('circumstancesLR', {
      question: yourCircumstancesLR.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstancesLR.noRadioOption,
    });
    await performAction('selectExceptionalHardshipLR', {
      question: exceptionalHardshipLR.mainHeader,
      exceptionalHardshipOption: exceptionalHardshipLR.noRadioOption,
    });
    await performAction('selectIncomeAndExpensesLR', {
      incomeAndExpensesOption: incomeAndExpensesLR.noRadioOption,
    });
    await performAction('otherConsiderationsLR', {
      question: otherConsiderationsLR.isThereAnythingElseParagraph,
      option: otherConsiderationsLR.noRadioOption,
    });
    await performAction('uploadFiles');
    await performValidation('mainHeader', equalityAndDiversityStartLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityStartLR.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsed', {
      question: languageUsedLR.mainHeader,
      radioOption: languageUsedLR.englishRadioOption,
    });
    //await performAction('clickButton', 'Submit');
  });
});
