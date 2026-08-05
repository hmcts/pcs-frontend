import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  correspondenceAddress,
  counterClaimAboutLR,
  counterClaimAgainstWhomLR,
  counterClaimFeeLR,
  counterClaimLR,
  counterClaimSpecificSumOfMoneyLR,
  counterClaimWhatAreYouClaimingForLR,
  counterclaimDoYouWantToUploadFilesLR,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHomeLR,
  doYouHaveAnyDependantChildrenLR,
  doYouHaveAnyOtherDependantsLR,
  equalityAndDiversityEndLR,
  equalityAndDiversityStartLR,
  exceptionalHardshipLR,
  incomeAndExpensesLR,
  languageUsedLR,
  nonRentArrearsDisputeLR,
  otherConsiderationsLR,
  priorityDebtsLR,
  selectDefendant,
  startNow,
  tenancyTypeDetailsLR,
  whatOtherRegularExpensesDoYouHaveLR,
  whatRegularIncomeDoYouReceiveLR,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR,
  yourCircumstancesLR,
} from '../data/page-data/lr-page-data';
import { user } from '../data/user-data';
import { defendantNameConfirmationErrorValidation } from '../functional/legalRepresentative-functional/defendantNameConfirmation.pft.lr';
import { selectDefendantErrorValidation } from '../functional/legalRepresentative-functional/selectDefendant.pft.lr';
import { tenancyDateUnknownErrorValidation } from '../functional/tenancyDateUnknown.pft';
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { getRelativeDate } from '../utils/common/date.utils';
import {
  assertAllErrorMessageValidations,
  clearErrorMessageValidationFailures,
  softErrorMessageValidation,
} from '../utils/common/error-message-validation-helper';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { ErrorMessageValidation } from '../utils/validations/custom-validations';

// softErrorMessageValidation(pageName, validationOrReason):
// - 1st param: journey page key/name (for example 'tenancyTypeDetails').
// - 2nd param: PFT error-validation function for that page, or a custom string
//   to explain why ErrorMessageValidation(EMV) is missing/deferred/not applicable.

const NO_EMV_READ_ONLY = 'Read-only / informational screen — no field error validation.';
// // const NO_EMV_PLACEHOLDER_PAGE = 'Placeholder page — ErrorMessageValidation(EMV) is not designed yet.';
// const NO_EMV_MISSING_DESIGN = 'ErrorMessageValidation(EMV) is missing for this page and needs to be designed.';

const home_url = process.env.TEST_URL;
let claimantName: string;
test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-lr-enabled');
  process.env.NOTICE_SERVED = 'YES';
  if (testInfo.title.includes('@nonRent')) {
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadAssuredTenancy.claimantName;
    claimantName = process.env.CLAIMANT_NAME;
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

  if (testInfo.title.includes('Instalments')) {
    claimantName = submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown });
  }

  if (
    testInfo.title.includes('Something else') ||
    testInfo.title.includes('CounterClaim - Something else - Defendant need help')
  ) {
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadAssuredTenancy.claimantName;
    claimantName = process.env.CLAIMANT_NAME;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    process.env.TENANCY_TYPE = 'ASSURED_TENANCY';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  }

  if (
    testInfo.title.includes('CounterClaim - Defendant need help') ||
    testInfo.title.includes('CounterClaim - Defendant need help - Has the defendant already applied - No')
  ) {
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
  console.log(`${process.env.CASE_NUMBER}`);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor.email);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  ErrorMessageValidation.clearResults();
  clearErrorMessageValidationFailures();
});

test.describe('Respond to claim — LR ErrorMessageValidation(EMV) journey @nightly @EMV', () => {
  test('ErrMsg - NonRentArrears - AssuredTenancy - LR @smoke @regression @nonRent @LR', async () => {
    await softErrorMessageValidation('selectDefendant', selectDefendantErrorValidation);
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });

    await softErrorMessageValidation('defendantNameConfirmation', defendantNameConfirmationErrorValidation);
    await performAction('confirmDefendantDetailsLR', {
      question: defendantNameConfirmation.mainHeader(pin2User.firstName, pin2User.lastName),
      option: defendantNameConfirmation.yesRadioOption,
    });

    await softErrorMessageValidation('defendantDateOfBirth', NO_EMV_READ_ONLY);
    await performAction('enterDateOfBirthDetailsLR', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });

    await performAction('selectCorrespondenceAddressUnKnownLR', {
      radioOption: correspondenceAddress.yesRadioOption,
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
    assertAllErrorMessageValidations();
  });

  test('NonRentArrears - Secure - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @secureFlexible', async () => {
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetailsLR.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetailsLR.giveCorrectTenancyTypeTextInput,
    });

    await softErrorMessageValidation('tenancyDateUnknown', tenancyDateUnknownErrorValidation);
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    assertAllErrorMessageValidations();
  });
});
