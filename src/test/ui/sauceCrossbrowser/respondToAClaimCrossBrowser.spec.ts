/**
 * Sauce only: `playwright.sauce.config.ts` has no `globalSetup`, so S2S/IDAM run here after the tunnel is ready.
 * Root `playwright.config.ts` ignores this folder — Jenkins/local E2E use `globalSetup` only.
 */
import { getAccessToken, getS2SToken } from '../config/global-setup.config';
import { submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  defendantDateOfBirth,
  defendantNameCapture,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  equalityAndDiversityEnd,
  equalityAndDiversityStart,
  exceptionalHardship,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  installmentPayments,
  languageUsed,
  nonRentArrearsDispute,
  priorityDebtDetails,
  priorityDebts,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { getRelativeDate } from '../utils/common/string.utils';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;
let claimantName: string;

test.beforeEach(async ({ page }) => {
  await getS2SToken();
  await getAccessToken();
  initializeExecutor(page);

  process.env.NOTICE_SERVED = 'YES';
  process.env.RENT_NON_RENT = 'YES';
  process.env.NOTICE_DETAILS_NO_NOTSURE = 'NO';

  claimantName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
  process.env.CLAIMANT_NAME = claimantName;
  process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
  process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';

  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });

  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  logTestEnvAfterBeforeEach(
    'Respond to a claim @noDefendants @regression @crossbrowser (Sauce)',
    RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS
  );
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
//@noDefendants(submitCasePayloadNoDefendants) represents all defendant details unknown pages and non-rent arrears
//All defendant details known pages and Rent-arrears routing is covered in submitCasePayload
//Mix and match of testcases needs to updated in e2etests once complete routing is implemented. ex: (Tendency type HDPI-3316 etc.)
test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim @noDefendants @regression @crossbrowser', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
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
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.yesRadioOption);
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
    //This is a placeholder page
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    // Downstream flow up to 'instalmentPayments' page should be modified since it's Non rent arrears test case.HDPI-5732
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
      question: yourCircumstances.mainHeader,
      yourCircumstancesOption: yourCircumstances.yesRadioOption,
    });
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.yesRadioOption,
    });
    await performValidation('mainHeader', incomeAndExpenses.mainHeader);
    await performAction('clickButton', incomeAndExpenses.continueButton);
    await performAction('clickButton', whatRegularIncomeDoYouReceive.continueButton);
    await performAction('clickButton', haveYouAppliedForUniversalCredit.continueButton);
    await performAction('clickButton', priorityDebts.continueButton);
    await performAction('clickButton', priorityDebtDetails.continueButton);
    await performAction('clickButton', whatOtherRegularExpensesDoYouHave.continueButton);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performAction('clickButton', equalityAndDiversityEnd.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
  });
});
