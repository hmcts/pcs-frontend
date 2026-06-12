import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  circumstancesLR,
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  correspondenceAddress,
  counterClaim,
  counterClaimAgainstWhom,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  endNow,
  equalityAndDiversityEnd,
  equalityAndDiversityStart,
  exceptionalHardship,
  incomeAndExpenses,
  languageUsed,
  nonRentArrearsDispute,
  otherConsiderations,
  priorityDebtDetails,
  priorityDebts,
  startNow,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
} from '../data/page-data';
import { user } from '../data/user-data';
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { getRelativeDate } from '../utils/common/string.utils';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'YES';
  process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadAssuredTenancy.claimantName;
  process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
  process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
  process.env.TENANCY_TYPE = 'ASSURED_TENANCY';
  process.env.NOTICE_SERVED = 'NO';
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  await performAction('fetchPINsAPI');
  await performAction('getCaseAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login', user.defendantSolicitor.email);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim LR - e2e Journey @nightly', async () => {
  test('Respond to claim - LR @smoke @regression @PR', async () => {
    const pin2User = await getPinUserAt(1);
    await performAction('representationLR', {
      question: counterClaimAgainstWhom.lrHiddenMainHeader,
      radioOption: `${pin2User.firstName} ${pin2User.lastName}`,
    });
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.getLrMainHeader(pin2User.firstName, pin2User.lastName),
      option: defendantNameConfirmation.yesRadioOption,
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
      radioOption: contactPreferenceEmailOrPost.byPostCheckbox,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
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
    await performAction('selectNoticeDetailsLR', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknownLR');
    await performAction('disputingOtherPartsOfTheClaimLR', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performAction('selectCounterClaim', {
      option: counterClaim.yesRadioOption,
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
      question: circumstancesLR.lrWouldYouLikeToShareHeader,
      yourCircumstancesOption: circumstancesLR.yesRadioOption,
    });
    await performAction('exceptionalHardshipLR', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.yesRadioOption,
    });
    await performAction('selectIncomeAndExpenses', {
      incomeAndExpensesOption: incomeAndExpenses.yesRadioOption,
    });
    await performAction('selectWhatRegularIncomeDoYouReceive', {
      regularIncomeOptions: [
        [
          whatRegularIncomeDoYouReceive.universalCreditParagraph,
          whatRegularIncomeDoYouReceive.universalCreditTextInput,
          whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
        ],
      ],
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
      option: otherConsiderations.yesRadioOption,
      courtInfo: otherConsiderations.detailsTextInput,
    });
    await performAction('uploadFiles');
    await performValidation('mainHeader', equalityAndDiversityStart.mainHeader);
    await performAction('clickButton', equalityAndDiversityStart.continueButton);
    await performValidation('mainHeader', equalityAndDiversityEnd.mainHeader);
    await performAction('clickButton', equalityAndDiversityEnd.continueButton);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });
    await performAction('clickButton', 'Save and continue');
    await performAction('clickButton', endNow.continueButton);
  });
});
