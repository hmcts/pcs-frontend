import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  confirmationOfNoticeGiven,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimAgainstWhom,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  counterclaimDoYouWantToUploadFiles,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  doYouWantToUploadFilesToSupportYourCounterclaim,
  emailConfirmation,
  equalityAndDiversityEndLR,
  equalityAndDiversityStart,
  exceptionalHardship,
  exemptLandlord,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  installmentPayments,
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
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  writtenTerms,
  yourCircumstances,
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
  submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales = process.env.OCCUPATION_LICENCE_TYPE;
  // claimantName = process.env.CLAIMANT_NAME;
  await performAction('createCaseAPI', { data: createCaseApiWalesData.createCasePayload });
  if (testInfo.title.includes('@multiDefendant')) {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseDefendantSecure });
    claimantName = submitCaseApiDataWales.submitCaseDefendantSecure.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
  } else if (testInfo.title.includes('Other')) {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseDefendantOther });
    claimantName = submitCaseApiDataWales.submitCaseDefendantOther.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
  } else if (testInfo.title.includes('@standardRNR')) {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseRentNonRentStandardDefendant });
    claimantName = submitCaseApiDataWales.submitCaseRentNonRentStandardDefendant.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
  } else if (testInfo.title.includes('@singleDefendant')) {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitcaseNonRentSecureSingleDefendant });
    claimantName = submitCaseApiDataWales.submitcaseNonRentSecureSingleDefendant.claimantName;
    process.env.CLAIMANT_NAME = claimantName;
  }
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('getCaseAPI');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor.email);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

//Skipping these tests temporarily in @nightly as LR feature will be toggled off in all test environments until the first release HDPI-7531
//selectNoticeDetails= defendant not sure, repaymentsAgreed - no - InstalmentPayments - Yes, Instalments
test.describe('Respond to a claim LR - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @multiDefendant @PR @smoke @regression @LR', async () => {
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
      radioOption: 'Yes',
    });
    await performAction('emailConfirmationLR', {
      radioOption: emailConfirmation.yesRadioOption,
      emailAddress: emailConfirmation.emailAddressTextInput,
    });
    await performAction('exemptLandlordLR', exemptLandlord.yesRadioOption);
    await performAction('selectWrittenTermsLR', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiDataWales.submitCaseDefendantSecure.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnownLR', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateKnownLR');
    await performAction('rentArrearsLR', {
      option: rentArrears.yesRadioOption,
      rentArrearsTotal: submitCaseApiDataWales.submitCaseDefendantSecure.rentArrears_Total,
    });
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
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
      option: counterClaimSpecificSumOfMoney.yesRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
    });
    await performAction('selectCounterClaimFeeLR', {
      radioOption: counterClaimFee.defendantNeedHelpRadioOption,
      typeOfClaim: counterClaimWhatAreYouClaimingFor.sumOfMoneyOrCompensationRadioOption,
      amount: counterClaimSpecificSumOfMoney.claimInput,
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
    await performAction('doYouWantToUploadFilesLR', {
      option: doYouWantToUploadFilesToSupportYourCounterclaim.yesRadioOption,
    });
    await performAction('uploadFilesToSupportCounterclaimLR', { files: ['rentArrears.pdf'] });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentAgreedLR', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPaymentsLR', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.noRadioOption,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('otherDependantsLR', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('otherAdultsLR', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('alternativeAccommodationLR', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.defendantNotSureRadioOption,
    });
    await performAction('circumstancesLR', {
      question: yourCircumstances.mainHeader,
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
      creditRadioOption: haveYouAppliedForUniversalCredit.noRadioOption,
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
    await performAction('selectExpensesLR', {
      regularIncomeOptions: [
        [
          whatOtherRegularExpensesDoYouHave.groceryShoppingParagraph,
          whatOtherRegularExpensesDoYouHave.groceryShoppingTotalAmountInput,
          whatOtherRegularExpensesDoYouHave.groceryShoppingWeekHiddenRadioOption,
        ],
      ],
    });
    await performAction('otherConsiderationsLR', {
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.yesRadioOption,
      courtInfo: otherConsiderations.detailsTextInput,
    });
    await performAction('uploadAdditionalDocumentsLR');
    await performValidation('mainHeader', equalityAndDiversityStart.mainHeader);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.whichLanguageParagraph,
      radioOption: languageUsed.englishRadioOption,
    });
  });

  test('Respond to a claim - Wales - Other contract - Rent Arrears @LR', async () => {
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
      radioOption: correspondenceAddress.noRadioOption,
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('emailConfirmationLR', {
      radioOption: emailConfirmation.yesRadioOption,
      emailAddress: emailConfirmation.emailAddressTextInput,
    });
    await performAction('exemptLandlordLR', exemptLandlord.imNotSureRadioOption);
    await performAction('selectWrittenTermsLR', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiDataWales.submitCaseDefendantOther.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnownLR', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.defendantNotSureRadioOption,
    });
    await performAction('rentArrearsLR', {
      option: rentArrears.yesRadioOption,
      rentArrearsTotal: submitCaseApiDataWales.submitCaseDefendantOther.rentArrears_Total,
    });
    await performAction('selectCounterClaimLR', {
      option: counterClaim.noRadioOption,
    });
    await performAction('previousPaymentsLR', {
      question: repaymentsMade.getMainHeader(),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentAgreedLR', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPaymentsLR', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.noRadioOption,
    });
    await performAction('doesTheDependantHaveChildrenLR', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
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
      question: yourCircumstances.mainHeader,
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
      question: otherConsiderations.mainHeader,
      option: otherConsiderations.noRadioOption,
    });
    await performAction('uploadAdditionalDocumentsLR');
    await performValidation('mainHeader', equalityAndDiversityStart.mainHeader);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEndLR.mainHeader);
    await performAction('clickButton', equalityAndDiversityEndLR.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.whichLanguageParagraph,
      radioOption: languageUsed.welshRadioOption,
    });
  });

  test('RentArrears - NonRent - Standard contract - CounterClaim - Defendant need help - LR @standardRNR @smoke @rent @LR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
    await performAction('confirmDefendantDetailsLR', {
      question: defendantNameConfirmation.mainHeader(pin2User.firstName, pin2User.lastName),
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
    await performAction('exemptLandlordLR', exemptLandlord.yesRadioOption);
    await performAction('selectWrittenTermsLR', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiDataWales.submitCaseRentNonRentStandardDefendant.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnownLR', {
      option: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('rentArrearsLR', {
      option: rentArrears.yesRadioOption,
      rentArrearsTotal: submitCaseApiDataWales.submitCaseRentNonRentStandardDefendant.rentArrears_Total,
    });
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaimLR', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
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
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    // //await performAction('clickButton', 'Submit');
  });

  test('NonRentArrears - Secure - LR @smoke @PR @singleDefendant @LR', async () => {
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
    await performAction('exemptLandlordLR', exemptLandlord.yesRadioOption);
    await performAction('selectWrittenTermsLR', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetailsLR', {
      tenancyType: submitCaseApiDataWales.submitcaseNonRentSecureSingleDefendant.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnownLR', {
      option: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.yesRadioOption,
      disputeInfo: nonRentArrearsDispute.explainClaimTextInput,
    });
    await performAction('selectCounterClaimLR', {
      option: counterClaim.yesRadioOption,
    });
    await performAction('selectWhatAreYouClaimingForLR', {
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
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
  });
});
