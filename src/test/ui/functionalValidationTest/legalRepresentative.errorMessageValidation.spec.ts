import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { responseAndCounterClaimSubmitted } from '../data/page-data';
import {
  confirmationOfNoticeGiven,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimAgainstWhom,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimOrderOtherThanSum,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  counterclaimDoYouWantToUploadFiles,
  counterclaimYouNeedToApplyForHelpWithYourFees,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  doYouWantToUploadFilesToSupportYourCounterclaim,
  emailConfirmation,
  endOfJourneyCYA,
  exceptionalHardship,
  incomeAndExpenses,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  selectDefendant,
  startNow,
  tenancyDateDetails,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data/lr-page-data';
import { user } from '../data/user-data';
import {
  confirmationOfNoticeGivenErrorValidation,
  counterClaimAboutErrorValidation,
  counterClaimAgainstWhomErrorValidation,
  counterClaimErrorValidation,
  counterClaimFeeErrorValidation,
  counterClaimHaveYouAppliedForHelpErrorValidation,
  counterClaimOrderOtherThanSumErrorValidation,
  counterClaimSpecificSumOfMoneyErrorValidation,
  counterClaimWhatAreYouClaimingForErrorValidation,
  counterclaimYouNeedToApplyForHelpWithYourFeesErrorValidation,
  defendantNameConfirmationErrorValidation,
  doAnyOtherAdultsLiveInYourHomeErrorValidation,
  doYouHaveAnyDependantChildrenErrorValidation,
  doYouHaveAnyOtherDependantsErrorValidation,
  doYouWantToUploadFilesToSupportYourCounterclaimErrorValidation,
  emailConfirmationErrorValidation,
  selectDefendantErrorValidation,
} from '../functional/legalRepresentative-functional';
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { getRelativeDate } from '../utils/common/date.utils';
import {
  assertAllErrorMessageValidations,
  clearErrorMessageValidationFailures,
  softErrorMessageValidation,
} from '../utils/common/error-message-validation-helper';
import {
  RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS,
  RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS,
  logTestEnvAfterBeforeEach,
} from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction } from '../utils/controller';
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
const isLR = true;

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
  } else if (testInfo.title.includes('@defendantAddressKnown')) {
    claimantName = submitCaseApiData.submitCaseDefendantAddressKnown.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCaseDefendantAddressKnown });
  } else {
    process.env.NOTICE_SERVED = 'YES';
    process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    claimantName = submitCaseApiData.submitCasePayload.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
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
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor.email);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  ErrorMessageValidation.clearResults();
  clearErrorMessageValidationFailures();
});

test.describe('Respond to claim — LR ErrorMessageValidation(EMV) journey @nightly @EMV', () => {
  test('ErrMsg - NonRentArrears - AssuredTenancy - LR @smoke @nonRent @LR', async () => {
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

    //the below line needs to be un-commented when HDPI-8154 bug is fixed.
    //await softErrorMessageValidation('correspondenceAddress', correspondenceAddressErrorValidation);
    await performAction('selectCorrespondenceAddressLR', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await softErrorMessageValidation('emailConfirmation', emailConfirmationErrorValidation);
    await performAction('emailConfirmationLR', {
      radioOption: emailConfirmation.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnownLR', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await softErrorMessageValidation('confirmationOfNoticeGiven', confirmationOfNoticeGivenErrorValidation);
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknownLR');
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await softErrorMessageValidation('counterClaim', counterClaimErrorValidation);
    await performAction('selectCounterClaimLR', {
      question: counterClaim.getDoYouWantToMakeACounterclaimQuestion(),
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
      option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoneyLR', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.yesRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await softErrorMessageValidation('counterClaimFee', counterClaimFeeErrorValidation);
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    const pinUser = await getPinUserAt(2);
    await softErrorMessageValidation('counterClaimAgainstWhom', counterClaimAgainstWhomErrorValidation);
    await performAction('selectClaimAgainstWhomLR', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName, `${pinUser.firstName} ${pinUser.lastName}`],
    });
    await softErrorMessageValidation('counterClaimAbout', counterClaimAboutErrorValidation);
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFilesLR', {
      option: counterclaimDoYouWantToUploadFiles.yesRadioOption,
    });
    await performAction('uploadFilesToSupportCounterclaimLR', { files: ['rentArrears.pdf'] });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('circumstancesLR', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.yesRadioOption,
    });
    await performAction('selectExceptionalHardshipLR', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.yesRadioOption,
    });
    await performAction('selectIncomeAndExpensesLR', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.universalCreditParagraph,
          whatRegularIncomeDoYouReceive.universalCreditTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
      ],
    });
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.noRadioOption,
    });
    await performAction('selectExpensesLR', {
      regularExpensesOptions: [
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
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.isThereAnythingElseParagraph,
      option: otherConsiderations.yesRadioOption,
      courtInfo: otherConsiderations.detailsTextInput,
    });
    await performAction('uploadFiles');
    await performAction('languageUsedLR', {
      question: languageUsed.whichLanguageParagraph,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('selectStatementOfTruthRTCLR', {
      checkBox: endOfJourneyCYA.factsTrueCheckboxLabel,
      firstName: endOfJourneyCYA.fullNameTextInput,
      firmName: endOfJourneyCYA.nameOfFirmTextInput,
      position: endOfJourneyCYA.positionOrOfficeHeldTextInput,
    });
    assertAllErrorMessageValidations();
  });

  test('NonRentArrears - AssuredTenancy - CounterClaim - Something else - Defendant need help - LR @nonRent @LR', async () => {
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
    await performAction('enterDateOfBirthDetailsLR', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressLR', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('emailConfirmationLR', {
      radioOption: emailConfirmation.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
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
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaimLR', {
      question: counterClaim.getDoYouWantToMakeACounterclaimQuestion(),
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
    });
    await performAction('counterClaimHaveYouAppliedForHelpWithFeeLR', {
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    const pinUser = await getPinUserAt(2);
    await performAction('selectClaimAgainstWhomLR', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName, `${pinUser.firstName} ${pinUser.lastName}`],
    });
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await softErrorMessageValidation('counterClaimOrderOtherThanSum', counterClaimOrderOtherThanSumErrorValidation);
    await performAction('counterClaimOrderOtherThanSumLR', {
      ordersInput: counterClaimOrderOtherThanSum.whatOrdersInput,
      factsInput: counterClaimOrderOtherThanSum.whatFactsInput,
    });
    await performAction('doYouWantToUploadFilesLR', {
      option: counterclaimDoYouWantToUploadFiles.noRadioOption,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependants.noRadioOption,
    });
    await softErrorMessageValidation('doAnyOtherAdultsLiveInYourHome', doAnyOtherAdultsLiveInYourHomeErrorValidation);
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
      ...getRelativeDate(5),
    });
    await performAction('circumstancesLR', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.yesRadioOption,
    });
    await performAction('selectExceptionalHardshipLR', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.yesRadioOption,
    });
    await performAction('selectIncomeAndExpensesLR', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.universalCreditParagraph,
          whatRegularIncomeDoYouReceive.universalCreditTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
      ],
    });
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.noRadioOption,
    });
    await performAction('selectExpensesLR', {
      regularExpensesOptions: [
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
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.isThereAnythingElseParagraph,
      option: otherConsiderations.yesRadioOption,
      courtInfo: otherConsiderations.detailsTextInput,
    });
    await performAction('uploadAdditionalDocumentsLR');
    await performValidation('mainHeader', equalityAndDiversityStart.mainHeader);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsedLR', {
      question: languageUsed.whichLanguageParagraph,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('retrieveCYATableDataRTC', isLR);
    await performAction('validateCYARTC', isLR);
    await performAction('selectStatementOfTruthRTCLR', {
      checkBox: endOfJourneyCYA.factsTrueCheckboxLabel,
      firstName: endOfJourneyCYA.fullNameTextInput,
      firmName: endOfJourneyCYA.nameOfFirmTextInput,
      position: endOfJourneyCYA.positionOrOfficeHeldTextInput,
    });
    await performAction('clickButton', responseAndCounterClaimSubmitted.closeAndReturnToCaseOverviewButton);
  });

  test('RentArrears - Verify dynamic link @LR', async () => {
    const pinUser = await getPinUserAt(0);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pinUser.firstName} ${pinUser.lastName}`,
    });
    await performAction('confirmDefendantDetailsLR', {
      question: defendantNameConfirmation.mainHeader(pinUser.firstName, pinUser.lastName),
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetailsLR', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressLR', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('emailConfirmationLR', {
      radioOption: emailConfirmation.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
      //showTenancyDocumentLink: true,
    });
    await performAction('selectTenancyStartDateKnownLR', {
      option: tenancyDateDetails.yesRadioOption,
    });
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnownLR');
    await performAction('rentArrearsLR', {
      option: rentArrears.yesRadioOption,
      rentArrearsTotal: submitCaseApiData.submitCasePayload.rentArrears_Total,
      showRentDocumentLink: true,
    });
    await performAction('selectCounterClaimLR', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    });
    await softErrorMessageValidation('counterClaimSpecificSumOfMoney', counterClaimSpecificSumOfMoneyErrorValidation);
    await performAction('counterClaimSpecificSumOfMoneyLR', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueFEE0508Input,
    });
    await softErrorMessageValidation(
      'counterClaimWhatAreYouClaimingFor',
      counterClaimWhatAreYouClaimingForErrorValidation
    );
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueFEE0508Input,
    });
    await softErrorMessageValidation(
      'counterClaimHaveYouAppliedForHelp',
      counterClaimHaveYouAppliedForHelpErrorValidation
    );
    await performAction('counterClaimHaveYouAppliedForHelpWithFeeLR', {
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    const pin2User = await getPinUserAt(1);
    await performAction('selectClaimAgainstWhomLR', {
      question: counterClaimAgainstWhom.mainHeader,
      options: [claimantName, `${pin2User.firstName} ${pin2User.lastName}`],
    });
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await softErrorMessageValidation(
      'doYouWantToUploadFilesToSupportYourCounterclaim',
      doYouWantToUploadFilesToSupportYourCounterclaimErrorValidation
    );
    await performAction('doYouWantToUploadFilesLR', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption,
    });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreed.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });
    await softErrorMessageValidation('doYouHaveAnyDependantChildren', doYouHaveAnyDependantChildrenErrorValidation);
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await softErrorMessageValidation('doYouHaveAnyOtherDependants', doYouHaveAnyOtherDependantsErrorValidation);
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.noRadioOption,
    });
    await performAction('circumstancesLR', {
      question: yourCircumstances.wouldYouLikeToShareHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });
    await performAction('selectExceptionalHardshipLR', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });
    await performAction('selectIncomeAndExpensesLR', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR', {
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
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.noRadioOption,
    });
    await performAction('selectExpensesLR');
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('uploadAdditionalDocumentsLR');
    await performValidation('mainHeader', equalityAndDiversityStart.mainHeader);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
  });
});

test('RentArrears - DemotedTenancy - CounterClaim - Defendant need help - Has the defendant already applied - No - LR @rent @LR', async () => {
  const pinUser = await getPinUserAt(0);
  await performAction('confirmDefendantDetailsLR', {
    question: defendantNameConfirmation.mainHeader(pinUser.firstName, pinUser.lastName),
    option: defendantNameConfirmation.noRadioOption,
    fName: defendantNameConfirmation.firstNameInputText,
    lName: defendantNameConfirmation.lastNameInputText,
  });
  await performAction('enterDateOfBirthDetailsLR', {
    dobDay: defendantDateOfBirth.dayInputText,
    dobMonth: defendantDateOfBirth.monthInputText,
    dobYear: defendantDateOfBirth.yearInputText,
  });
  await performAction('selectCorrespondenceAddressLR', {
    radioOption: correspondenceAddress.yesRadioOption,
  });
  await performAction('emailConfirmationLR', {
    radioOption: emailConfirmation.noRadioOption,
  });
  await performAction('tenancyOrContractTypeDetailsLR', {
    tenancyType: submitCaseApiData.submitCaseRentDemotedCorrespondenceAddressUnknown.tenancy_TypeOfTenancyLicence,
    tenancyOption: tenancyTypeDetails.noRadioOption,
    tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
  });
  await performAction('enterTenancyStartDetailsUnKnownLR');
  await performAction('selectNoticeDetailsLR', {
    option: confirmationOfNoticeGiven.noRadioOption,
  });
  await performAction('rentArrearsLR', {
    option: rentArrears.yesRadioOption,
    rentArrearsTotal: submitCaseApiData.submitCaseRentDemotedCorrespondenceAddressUnknown.rentArrears_Total,
  });
  await performAction('selectCounterClaimLR', {
    option: counterClaim.yesRadioOption,
  });
  await performAction('selectWhatAreYouClaimingForLR', {
    question: counterClaimWhatAreYouClaimingFor.mainHeader,
    option: counterClaimWhatAreYouClaimingFor.bothRadioOption,
  });
  await performAction('counterClaimSpecificSumOfMoneyLR', {
    question: counterClaimSpecificSumOfMoney.mainHeader,
    option: counterClaimSpecificSumOfMoney.noRadioOption,
    amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
  });
  await performAction('selectCounterClaimFeeLR', {
    radioOption: counterClaimFee.defendantNeedHelpRadioOption,
    typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
    amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
  });
  await performAction('counterClaimHaveYouAppliedForHelpWithFeeLR', {
    helpWithFeeOption: counterClaimHaveYouAppliedForHelp.noRadioOption,
  });
  await softErrorMessageValidation(
    'counterclaimYouNeedToApplyForHelpWithYourFees',
    counterclaimYouNeedToApplyForHelpWithYourFeesErrorValidation
  );
  await performValidation('mainHeader', counterclaimYouNeedToApplyForHelpWithYourFees.mainHeader);
});
