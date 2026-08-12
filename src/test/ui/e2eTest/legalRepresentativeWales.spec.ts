import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  confirmationOfNoticeGiven,
  counterClaim,
  counterClaimAbout,
  counterClaimAgainstWhom,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
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
  // claimantName = process.env.CLAIMANT_NAME;
  await performAction('createCaseAPI', { data: createCaseApiWalesData.createCasePayload });
  if (process.env.OCCUPATION_LICENCE_TYPE === 'SECURE_CONTRACT') {
    process.env.RENT_NON_RENT = 'YES';
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseDefendantSecure });
    claimantName = submitCaseApiDataWales.submitCaseDefendantSecure.claimantName;
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
  test('Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @PR @smoke @regression @LR', async () => {
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
      tenancyType: submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales,
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

  // test('Respond to a claim - Wales - Other contract - Rent Arrears @noDefendants', async () => {
  //   await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  //   await performAction('selectDoYouHaveASolicitor', doYouHaveASolicitor.noRadioOption);
  //   await performAction('retrieveCYATableDataRTC', 'startNowAndDetails');
  //   await performAction('validateRTCSectionCYA', 'startNowAndDetails');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskList', { subSection: taskList.confirmDetailsLink });
  //   await performAction('inputDefendantDetails', {
  //     fName: defendantNameCapture.firstNameTextInput,
  //     lName: defendantNameCapture.lastNameTextInput,
  //   });
  //   await performAction('enterDateOfBirthDetails', {
  //     dobDay: defendantDateOfBirth.dayInputText,
  //     dobMonth: defendantDateOfBirth.monthInputText,
  //     dobYear: defendantDateOfBirth.yearInputText,
  //   });
  //   await performAction('selectCorrespondenceAddressKnown', {
  //     radioOption: correspondenceAddress.noRadioOption,
  //     addressLine1: correspondenceAddress.walesAddressLine1TextInput,
  //     townOrCity: correspondenceAddress.walesTownOrCityTextInput,
  //     postcode: correspondenceAddress.walesPostcodeTextInput,
  //   });
  //   await performAction('selectContactPreferenceEmailOrPost', {
  //     question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
  //     radioOption: contactPreferenceEmailOrPost.byEmailCheckbox,
  //     emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
  //   });
  //   await performAction('selectContactByTelephone', {
  //     radioOption: contactPreferencesTelephone.yesRadioOption,
  //     phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
  //   });
  //   await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
  //   await performAction('retrieveCYATableDataRTC', 'personalDetails');
  //   await performAction('validateRTCSectionCYA', 'personalDetails');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskList', { subSection: taskList.respondToSpecificPartsOfClaimantsClaimLink });
  //   await performAction(
  //     'disputeClaimInterstitial',
  //     submitCaseApiDataWales.submitCaseRentOtherTenancy.isClaimantNameCorrect
  //   );
  //   await performAction('exemptLandLord', exemptLandLord.imNotSureRadioOption);
  //   await performValidation('mainHeader', writtenTerms.mainHeader);
  //   await performAction('selectWrittenTerms', {
  //     question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
  //     radioOption: writtenTerms.noRadioOption,
  //   });
  //   await performAction('tenancyOrContractTypeDetails', {
  //     tenancyType: submitCaseApiDataWales.submitCaseRentOtherTenancy.occupationLicenceTypeWales,
  //     tenancyOption: tenancyTypeDetails.yesRadioOption,
  //   });
  //   await performAction('enterTenancyStartDetailsUnKnown');
  //   await performAction('selectNoticeDetails', {
  //     option: confirmationOfNoticeGiven.imNotSureRadioOption,
  //   });
  //   await performAction('rentArrears', {
  //     option: rentArrears.yesRadioOption,
  //   });
  //   await performAction('selectCounterClaim', {
  //     option: counterClaim.noRadioOption,
  //   });
  //   await performAction('retrieveCYATableDataRTC', 'disputeAndTenancy');
  //   await performAction('validateRTCSectionCYA', 'disputeAndTenancy');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskList', { subSection: taskList.declareRecentPaymentsHiddenLink });
  //   await performAction('readPaymentInterstitial');
  //   await performAction('repaymentsMade', {
  //     question: repaymentsMade.getmainHeader(claimantName),
  //     repaymentOption: repaymentsMade.noRadioOption,
  //   });
  //   await performAction('repaymentsAgreed', {
  //     repaymentAgreedOption: repaymentsAgreed.noRadioOption,
  //   });
  //   await performAction('installmentPayments', {
  //     question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
  //     radioOption: installmentPayments.noRadioOption,
  //   });
  //   await performAction('retrieveCYATableDataRTC', 'payments');
  //   await performAction('validateRTCSectionCYA', 'payments');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskList', { subSection: taskList.householdAndCircumstancesLink });
  //   await performAction('readYourHouseholdAndCircumstances');
  //   await performAction('doYouHaveAnyDependantChildren', {
  //     dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
  //   });
  //   await performAction('doYouHaveAnyOtherDependants', {
  //     otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
  //     otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
  //   });
  //   await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
  //     radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
  //     details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
  //   });
  //   await performAction('selectAlternativeAccommodation', {
  //     radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
  //   });
  //   await performAction('yourCircumstances', {
  //     question: yourCircumstances.wouldYouLikeToShareHeader,
  //     yourCircumstancesOption: yourCircumstances.noRadioOption,
  //   });
  //   await performAction('exceptionalHardship', {
  //     question: exceptionalHardship.mainHeader,
  //     exceptionalHardshipOption: exceptionalHardship.noRadioOption,
  //   });
  //   await performAction('retrieveCYATableDataRTC', 'situationAndCircumstances');
  //   await performAction('validateRTCSectionCYA', 'situationAndCircumstances');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskList', { subSection: taskList.incomeAndExpensesLink });
  //   await performAction('selectIncomeAndExpenses', {
  //     incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
  //   });
  //   await performAction('otherConsiderations', {
  //     question: otherConsiderations.mainHeader,
  //     option: otherConsiderations.noRadioOption,
  //   });
  //   await performAction('retrieveCYATableDataRTC', 'incomeAndExpenditure');
  //   await performAction('validateRTCSectionCYA', 'incomeAndExpenditure');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskList', { subSection: taskList.uploadDocumentsLink });
  //   await performAction('uploadFiles');
  //   await performAction('retrieveCYATableDataRTC', 'uploadFiles');
  //   await performAction('validateRTCSectionCYA', 'uploadFiles');
  //   await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);
  //   await performAction('taskListStatus', {
  //     subSecArray: [
  //       taskList.readInformationAboutLink,
  //       taskList.respondToSpecificPartsOfClaimantsClaimLink,
  //       taskList.incomeAndExpensesLink,
  //       taskList.uploadDocumentsLink,
  //       taskList.confirmDetailsLink,
  //     ],
  //     status: 'Done',
  //   });
  //   await performAction('taskList', { subSection: taskList.checkYourAnswersAndSubmitHiddenLink });
  //   await performAction('languageUsed', {
  //     question: languageUsed.mainHeader,
  //     radioOption: languageUsed.englishRadioOption,
  //   });
  //   await performAction('clickButton', 'Submit');
  // });
});
