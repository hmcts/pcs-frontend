import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  correspondenceAddress,
  counterClaim,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  equalityAndDiversityEnd,
  equalityAndDiversityStart,
  exceptionalHardship,
  freeLegalAdvice,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  languageUsed,
  priorityDebtDetails,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyDateDetails,
  tenancyTypeDetails,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../data/page-data';
import { contactPreferenceEmailOrPostErrorValidation } from '../functional/contactPreferenceEmailOrPost.pft';
import { contactPreferencesTelephoneErrorValidation } from '../functional/contactPreferencesTelephone.pft';
import { correspondenceAddressKnownErrorValidation } from '../functional/correspondenceAddress.pft';
import { defendantDateOfBirthErrorValidation } from '../functional/defendantDateOfBirth.pft';
import { defendantNameConfirmationErrorValidation } from '../functional/defendantNameConfirmation.pft';
import { yourExceptionalHardShipErrorValidation } from '../functional/exceptionalHardship.pft';
import { freeLegalAdviceErrorValidation } from '../functional/freeLegalAdvice.pft';
import { languageUsedErrorValidation } from '../functional/languageUsed.pft';
import { rentArrearsErrorValidation } from '../functional/rentArrears.pft';
import { tenancyTypeDetailsErrorValidation } from '../functional/tenancyTypeDetails.pft';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction, performActions, performValidation } from '../utils/controller';
import { ErrorMessageValidation } from '../utils/validations/custom-validations';

import { createSoftEmvRunner } from './softEmvRunner';

const home_url = config.get('e2e.testUrl') as string;
let claimantName: string;

/** Env + API-backed case shape for this journey; returns claimant name for later steps. */
function introNoticeDateUnknownFixture(): string {
  const name = submitCaseApiData.submitCasePayload.claimantName;
  Object.assign(process.env, {
    CLAIMANT_NAME: name,
    NOTICE_SERVED: 'YES',
    NOTICE_DATE_PROVIDED: 'NO',
    TENANCY_TYPE: 'INTRODUCTORY_TENANCY',
    GROUNDS: 'RENT_ARREARS_GROUND10',
    NOTICE_DETAILS_NO_NOTSURE: 'NO',
    RENT_NON_RENT: 'YES',
    CORRESPONDENCE_ADDRESS: 'KNOWN',
  });
  return name;
}

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  claimantName = introNoticeDateUnknownFixture();
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.describe('Rent arrears introductory — notice date unknown (validation tests) @nightly @error', () => {
  test.afterEach(() => {
    ErrorMessageValidation.clearResults();
  });

  test('RentArrears - Introductory - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @regression', async ({
    page,
  }) => {
    const softEmv = createSoftEmvRunner(test.info(), { page });

    await softEmv.runSoftPftCheck('freeLegalAdvice', freeLegalAdviceErrorValidation);
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);

    await softEmv.runSoftPftCheck('defendantNameConfirmation', defendantNameConfirmationErrorValidation);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });

    await softEmv.runSoftPftCheck('defendantDateOfBirth', defendantDateOfBirthErrorValidation);
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });

    await softEmv.runSoftPftCheck('correspondenceAddressKnown', correspondenceAddressKnownErrorValidation);
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });

    await softEmv.runSoftPftCheck('contactPreferenceEmailOrPost', contactPreferenceEmailOrPostErrorValidation);
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });

    await softEmv.runSoftPftCheck('contactPreferencesTelephone', contactPreferencesTelephoneErrorValidation);
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.noRadioOption,
    });

    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);

    await softEmv.runSoftPftCheck('tenancyTypeDetails', tenancyTypeDetailsErrorValidation);
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnown', { option: tenancyDateDetails.yesRadioOption });
    await performAction('selectNoticeDetails', { option: confirmationOfNoticeGiven.yesRadioOption });
    await performAction('enterNoticeDateUnknown');

    await softEmv.runSoftPftCheck('rentArrears', rentArrearsErrorValidation);
    await performAction('rentArrears', { option: rentArrears.yesRadioOption });

    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');

    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      question: repaymentsAgreed.getMainHeader(claimantName),
      repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
      repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
    });

    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
      dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.noRadioOption,
    });
    await performAction('yourCircumstances', {
      question: yourCircumstances.mainHeader,
      yourCircumstancesOption: yourCircumstances.noRadioOption,
    });

    await softEmv.runSoftPftCheck('exceptionalHardship', yourExceptionalHardShipErrorValidation);
    await performAction('exceptionalHardship', {
      question: exceptionalHardship.mainHeader,
      exceptionalHardshipOption: exceptionalHardship.noRadioOption,
    });

    await performActions(
      'Continue through place holder pages for income, debts, expenses, equality',
      ['clickButton', incomeAndExpenses.continueButton],
      ['clickButton', whatRegularIncomeDoYouReceive.continueButton],
      ['clickButton', haveYouAppliedForUniversalCredit.continueButton],
      ['clickButton', priorityDebts.continueButton],
      ['clickButton', priorityDebtDetails.continueButton],
      ['clickButton', whatOtherRegularExpensesDoYouHave.continueButton],
      ['clickButton', equalityAndDiversityStart.continueButton],
      ['clickButton', equalityAndDiversityEnd.continueButton]
    );

    await softEmv.runSoftPftCheck('languageUsed', languageUsedErrorValidation);
    await performAction('languageUsed', {
      question: languageUsed.mainHeader,
      radioOption: languageUsed.englishRadioOption,
    });

    await softEmv.assertFailedStepsAtEnd();
  });
});
