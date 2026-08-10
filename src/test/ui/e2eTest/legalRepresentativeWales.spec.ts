import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPostLR,
  contactPreferencesTelephoneLR,
  contactPreferencesTextMessageLR,
  correspondenceAddressLR,
  counterClaimAboutLR,
  counterClaimAgainstWhomLR,
  counterClaimFeeLR,
  counterClaimHaveYouAppliedForHelpLR,
  counterClaimLR,
  counterClaimOrderOtherThanSumLR,
  counterClaimSpecificSumOfMoneyLR,
  counterClaimWhatAreYouClaimingForLR,
  counterclaimDoYouWantToUploadFilesLR,
  counterclaimYouNeedToApplyForHelpWithYourFeesLR,
  defendantDateOfBirthLR,
  defendantNameConfirmationLR,
  doAnyOtherAdultsLiveInYourHomeLR,
  doYouHaveAnyDependantChildrenLR,
  doYouHaveAnyOtherDependantsLR,
  equalityAndDiversityEndLR,
  equalityAndDiversityStartLR,
  exceptionalHardshipLR,
  haveYouAppliedForUniversalCreditLR,
  howMuchAffordToPayLR,
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
  selectDefendant,
  startNow,
  tenancyTypeDetailsLR,
  whatOtherRegularExpensesDoYouHaveLR,
  whatRegularIncomeDoYouReceiveLR,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR,
  yourCircumstancesLR,
} from '../data/page-data/lr-page-data';
import { user } from '../data/user-data';
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { getRelativeDate } from '../utils/common/date.utils';
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
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseDefendantSecure });
  }
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('getCaseAPI');
  //await performAction('navigateToUrl', home_url);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor.email);
  //await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

//Skipping these tests temporarily in @nightly as LR feature will be toggled off in all test environments until the first release HDPI-7531
//selectNoticeDetails= defendant not sure, repaymentsAgreed - no - InstalmentPayments - Yes, Instalments
test.describe('Respond to a claim LR - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @PR @smoke @regression @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
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
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: 'Yes',
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPostLR.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPostLR.byEmailCheckbox,
      emailAddress: contactPreferenceEmailOrPostLR.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephoneLR.noRadioOption,
    });
    await performAction('exemptLandlordLR', {
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
    await performAction('selectCounterClaimLR', {
      question: counterClaimLR.getDoYouWantToMakeACounterclaimQuestion(),
      option: counterClaimLR.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
      option: counterClaimWhatAreYouClaimingForLR.sumOfMoneyOrCompensationRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoneyLR', {
      question: counterClaimSpecificSumOfMoneyLR.mainHeader,
      option: counterClaimSpecificSumOfMoneyLR.yesRadioOption,
      amount: counterClaimSpecificSumOfMoneyLR.claimInput,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFeeLR.defendantDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingForLR.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoneyLR.claimInput,
    });
    const pinUser = await getPinUserAt(2);
    await performAction('selectClaimAgainstWhomLR', {
      question: counterClaimAgainstWhomLR.mainHeader,
      options: [claimantName, `${pinUser.firstName} ${pinUser.lastName}`],
    });
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAboutLR.counterClaimForInput,
      reasonsInput: counterClaimAboutLR.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFilesLR', {
      option: counterclaimDoYouWantToUploadFilesLR.yesRadioOption,
    });
    await performAction('uploadFilesToSupportCounterclaimLR', { files: ['rentArrears.pdf'] });
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
    await performAction('uploadAdditionalDocumentsLR');
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
