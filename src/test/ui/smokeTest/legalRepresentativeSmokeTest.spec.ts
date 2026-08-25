import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  correspondenceAddress,
  counterClaim,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  emailConfirmation,
  endOfJourneyCYA,
  equalityAndDiversityEndLR,
  equalityAndDiversityStart,
  exceptionalHardship,
  incomeAndExpenses,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  selectDefendant,
  startNow,
  tenancyTypeDetails,
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

test.describe('Respond to a claim LR - Smoke Journey @health', async () => {
  test('NonRentArrears - AssuredTenancy - LR @smoke @crossbrowser @nonRent @LR', async () => {
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
      option: counterClaim.noRadioOption,
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
      incomeAndExpensesOption: incomeAndExpenses.noRadioOption,
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
  });
});
