import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  counterClaimApplicationFeeAmount,
  counterClaimPaymentSuccessful,
  responseAndCounterClaimSubmitted,
  responseSubmitted,
  responseSubmittedCounterclaimFeePaymentNeeded,
  serviceRequestPayment,
} from '../data/page-data';
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
  equalityAndDiversityEndLR,
  equalityAndDiversityStart,
  exceptionalHardship,
  haveYouAppliedForUniversalCredit,
  howMuchAffordToPay,
  incomeAndExpenses,
  instalmentPayments,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  priorityDebtDetails,
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
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { getRelativeDate } from '../utils/common/date.utils';
import {
  RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS,
  RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS,
  logTestEnvAfterBeforeEach,
} from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;
const isLR = true;
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
  finaliseAllValidations();
});

//selectNoticeDetails= defendant not sure, repaymentsAgreed - no - InstalmentPayments - Yes, Instalments
test.describe('Respond to a claim LR - e2e Journey @nightly', async () => {
  test('NonRentArrears - AssuredTenancy - LR @nonRent @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
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
      radioOption: emailConfirmation.yesRadioOption,
      emailAddress: emailConfirmation.emailAddressTextInput,
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
      option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoneyLR', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.yesRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
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
    await performValidation('mainHeader', responseSubmittedCounterclaimFeePaymentNeeded.mainHeader);
    await performAction(
      'clickLinkAndSwitchToNewTab',
      responseSubmittedCounterclaimFeePaymentNeeded.payYourCounterclaimFeeOpensInNewTabLink
    );
    await performAction('validateCounterClaimApplicationFee', {
      amount: `£${counterClaimSpecificSumOfMoney.claimInput}`,
      fee: counterClaimSpecificSumOfMoney.feeHiddenAmount,
      isLegalRepresentative: true,
    });
    await performAction('selectPaymentOptions', {
      amountLabel: counterClaimApplicationFeeAmount.counterClaimFeeLabel,
      expectedAmount: `£${counterClaimSpecificSumOfMoney.feeHiddenAmount}`,
      payByOption: serviceRequestPayment.payByAccountRadioOption,
      pbaLabel: serviceRequestPayment.selectPBALabel,
      pbaValue: serviceRequestPayment.pbaIndex1,
      referenceLabel: serviceRequestPayment.pbaReferenceLabel,
      referenceText: serviceRequestPayment.pbaReferenceInputText,
      button: counterClaimApplicationFeeAmount.getLrPayButton('35.00'),
    });
    await performValidation('mainHeader', counterClaimPaymentSuccessful.mainHeader);
    await performValidation('text', {
      elementType: 'paragraph',
      text: counterClaimPaymentSuccessful.lrPaymentConfirmationParagraph,
    });
  });

  test('NonRentArrears - AssuredTenancy - Something else - LR @nonRent @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
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
      radioOption: counterClaimFee.defendantDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.somethingElseRadioOption,
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
    await performAction('uploadAdditionalDocumentsLR', { files: ['rentArrears.pdf'] });
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
    await performValidation('mainHeader', responseSubmittedCounterclaimFeePaymentNeeded.mainHeader);
    await performAction(
      'clickLinkAndSwitchToNewTab',
      responseSubmittedCounterclaimFeePaymentNeeded.payYourCounterclaimFeeOpensInNewTabLink
    );
    await performAction('validateCounterClaimApplicationFee', {
      amount: counterClaimApplicationFeeAmount.counterClaimAmountNotApplicable,
      fee: counterClaimApplicationFeeAmount.somethingElseCounterClaimFee,
      isLegalRepresentative: true,
    });
    await performAction('selectPaymentOptions', {
      amountLabel: counterClaimApplicationFeeAmount.counterClaimFeeLabel,
      expectedAmount: `£${counterClaimApplicationFeeAmount.somethingElseCounterClaimFee}`,
      payByOption: serviceRequestPayment.payByAccountRadioOption,
      pbaLabel: serviceRequestPayment.selectPBALabel,
      pbaValue: serviceRequestPayment.pbaIndex1,
      referenceLabel: serviceRequestPayment.pbaReferenceLabel,
      referenceText: serviceRequestPayment.pbaReferenceInputText,
      button: counterClaimApplicationFeeAmount.getLrPayButton(
        counterClaimApplicationFeeAmount.somethingElseCounterClaimFee
      ),
    });
    await performValidation('mainHeader', counterClaimPaymentSuccessful.mainHeader);
    await performValidation('text', {
      elementType: 'paragraph',
      text: counterClaimPaymentSuccessful.lrPaymentConfirmationParagraph,
    });
  });

  test('NonRentArrears - AssuredTenancy - CounterClaim - Something else - Defendant need help - LR @smoke @regression @nonRent @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
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

  test('RentArrears - NonRentArrears - AssuredTenancy - LR @smoke @PR @regression @rentNonRent @LR', async () => {
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
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('emailConfirmationLR', {
      radioOption: emailConfirmation.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnownLR', {
      option: tenancyDateDetails.yesRadioOption,
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
      option: rentArrears.noRadioOption,
      rentAmount: rentArrears.rentAmountTextInput,
      rentArrearsTotal: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.rentArrears_Total,
    });
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.yesRadioOption,
      disputeInfo: nonRentArrearsDispute.explainClaimTextInput,
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
      radioOption: counterClaimFee.defendantDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFilesLR', {
      option: counterclaimDoYouWantToUploadFiles.noRadioOption,
    });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreed.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: instalmentPayments.wouldDefendantLikeToOfferToPayQuestion,
      radioOption: instalmentPayments.noRadioOption,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.defendantNotSureRadioOption,
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
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR');
    await performAction('selectUniversalCreditLR', {
      question: haveYouAppliedForUniversalCredit.mainHeader,
      creditRadioOption: haveYouAppliedForUniversalCredit.yesRadioOption,
      ...getRelativeDate(-3),
    });
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.yesRadioOption,
    });
    await performAction('enterPriorityDebtDetailsLR', {
      totalAmount: priorityDebtDetails.totalAmountTextInput,
      payAmount: priorityDebtDetails.amountYouPayTextInput,
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetails.weekRadioOption,
    });
    await performAction('selectExpensesLR');
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.isThereAnythingElseParagraph,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('uploadAdditionalDocumentsLR', { files: ['rentArrears.pdf'] });
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
    await performAction(
      'clickButton',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
  });

  test('RentArrears - NonRentArrears - AssuredTenancy - Instalments - LR @smoke @PR @regression @rentNonRent @LR', async () => {
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
      tenancyType: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnownLR', {
      option: tenancyTypeDetails.yesRadioOption,
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
      option: rentArrears.noRadioOption,
      rentAmount: rentArrears.rentAmountTextInput,
      rentArrearsTotal: submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.rentArrears_Total,
    });
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.yesRadioOption,
      disputeInfo: nonRentArrearsDispute.explainClaimTextInput,
    });
    await performAction('selectCounterClaimLR', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
    });
    await performAction('counterClaimSpecificSumOfMoneyLR', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantDoNotNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueOfYourClaimInput,
    });
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFilesLR', {
      option: counterclaimDoYouWantToUploadFiles.noRadioOption,
    });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreed.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPaymentsLR', {
      question: instalmentPayments.wouldDefendantLikeToOfferToPayQuestion,
      radioOption: instalmentPayments.yesRadioOption,
    });
    await performAction('selectHowMuchAffordToPayLR', {
      affordToPay: howMuchAffordToPay.affordToPayTextInput,
      question: howMuchAffordToPay.howFrequentlyCouldDefendantAffordToPayQuestion,
      radioOption: howMuchAffordToPay.weeklyRadioOption,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.defendantNotSureRadioOption,
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
    await performAction('selectWhatRegularIncomeDoTheyReceiveLR');
    await performAction('selectUniversalCreditLR', {
      question: haveYouAppliedForUniversalCredit.mainHeader,
      creditRadioOption: haveYouAppliedForUniversalCredit.yesRadioOption,
      ...getRelativeDate(-3),
    });
    await performAction('selectPriorityDebtsLR', {
      question: priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebts.yesRadioOption,
    });
    await performAction('enterPriorityDebtDetailsLR', {
      totalAmount: priorityDebtDetails.totalAmountTextInput,
      payAmount: priorityDebtDetails.amountYouPayTextInput,
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetails.weekRadioOption,
    });
    await performAction('selectExpensesLR');
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.isThereAnythingElseParagraph,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('uploadAdditionalDocumentsLR', { files: ['rentArrears.pdf'] });
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
    await performAction(
      'clickButton',
      responseSubmittedCounterclaimFeePaymentNeeded.closeAndReturnToCaseOverviewButton
    );
  });

  test('RentArrears - DemotedTenancy - LR @smoke @rent @LR', async () => {
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
      option: counterClaim.noRadioOption,
    });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.yesRadioOption,
      repaymentInfo: repaymentsMade.detailsTextInput,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreed.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
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
      incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
    });
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.isThereAnythingElseParagraph,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('uploadAdditionalDocumentsLR', { files: ['rentArrears.docx'] });
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
    await performAction('clickButton', responseSubmitted.closeAndReturnToCaseOverviewButton);
  });

  test('RentArrears - DemotedTenancy - CounterClaim - Defendant need help - LR @smoke @rent @LR', async () => {
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
      option: counterClaimSpecificSumOfMoney.yesRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.bothRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('counterClaimHaveYouAppliedForHelpWithFeeLR', {
      helpWithFeeOption: counterClaimHaveYouAppliedForHelp.yesRadioOption,
      feeReference: counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput,
    });
    await performAction('counterClaimAboutLR', {
      counterClaimFor: counterClaimAbout.counterClaimForInput,
      reasonsInput: counterClaimAbout.reasonsForCounterClaimInput,
    });
    await performAction('doYouWantToUploadFilesLR', {
      option: counterclaimDoYouWantToUploadFiles.noRadioOption,
    });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.yesRadioOption,
      repaymentInfo: repaymentsMade.detailsTextInput,
    });
    await performAction('repaymentAgreedLR', {
      question: repaymentsAgreed.giveDetailsHiddenTextLabel,
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
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
      incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
    });
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.isThereAnythingElseParagraph,
      option: otherConsiderations.noRadioOption,
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
    await performValidation('mainHeader', responseAndCounterClaimSubmitted.mainHeader);
    await performValidation('text', {
      elementType: 'paragraph',
      text: responseAndCounterClaimSubmitted.reviewHwfApplicationParagraph,
    });
  });

  test('RentArrears - DemotedTenancy - CounterClaim - Defendant need help - Has the defendant already applied - No - LR @smoke @rent @LR', async () => {
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
    await performValidation('mainHeader', counterclaimYouNeedToApplyForHelpWithYourFees.mainHeader);
  });

  test('Submitted defendant should not be visible on the representation screen @nonRent @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
    await performAction('midEventRespondPossessionClaimLRAPI');
    await performAction('submitPossessionClaimResponseLRAPI');
    const submittedUser = await getPinUserAt(2);
    await performAction('clickLink', defendantNameConfirmation.backLink);
    await performValidation('textNotVisible', {
      elementType: 'text',
      text: `${submittedUser.firstName} ${submittedUser.lastName}`,
    });
  });

  test('RentArrears - Defendant address known - No - LR @smoke @defendantAddressKnown @LR', async () => {
    const pinUser = await getPinUserAt(0);
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
      tenancyType: submitCaseApiData.submitCaseDefendantAddressKnown.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnownLR');
    await performAction('rentArrearsLR', {
      option: rentArrears.yesRadioOption,
      rentArrearsTotal: submitCaseApiData.submitCaseDefendantAddressKnown.rentArrears_Total,
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
    await performValidation('mainHeader', counterclaimYouNeedToApplyForHelpWithYourFees.mainHeader);
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
    await performAction('counterClaimSpecificSumOfMoneyLR', {
      question: counterClaimSpecificSumOfMoney.mainHeader,
      option: counterClaimSpecificSumOfMoney.noRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueFEE0508Input,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.enterMaximumValueFEE0508Input,
    });
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
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
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
