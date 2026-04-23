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
import { doAnyOtherAdultsLiveInYourHomeErrorValidation } from '../functional/doAnyOtherAdultsLiveInYourHome.pft';
import { doYouHaveAnyDependantChildrenErrorValidation } from '../functional/doYouHaveAnyDependantChildren.pft';
import { doYouHaveAnyOtherDependantsErrorValidation } from '../functional/doYouHaveAnyOtherDependants.pft';
import { yourExceptionalHardShipErrorValidation } from '../functional/exceptionalHardship.pft';
import { freeLegalAdviceErrorValidation } from '../functional/freeLegalAdvice.pft';
import { languageUsedErrorValidation } from '../functional/languageUsed.pft';
import { rentArrearsErrorValidation } from '../functional/rentArrears.pft';
import { repaymentsAgreedErrorValidation } from '../functional/repaymentsAgreed.pft';
import { repaymentsMadeErrorValidation } from '../functional/repaymentsMade.pft';
import { tenancyDateDetailsErrorValidation } from '../functional/tenancyDateDetails.pft';
import { tenancyTypeDetailsErrorValidation } from '../functional/tenancyTypeDetails.pft';
import { wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation } from '../functional/wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.pft';
import { yourCircumstancesErrorValidation } from '../functional/yourCircumstances.pft';
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
});

test.describe('Rent arrears introductory — notice date unknown (validation tests) @nightly @error', () => {
  test.afterEach(() => {
    ErrorMessageValidation.clearResults();
  });

  test('RentArrears - Introductory - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @regression @error', async ({
    page,
  }) => {
    const softEmv = createSoftEmvRunner(test.info(), { page });

    await softEmv.readOnlyThen('startNow', () => performAction('clickButton', startNow.startNowButton));

    await softEmv.emvThen('freeLegalAdvice', freeLegalAdviceErrorValidation, () =>
      performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption)
    );

    await softEmv.emvThen('defendantNameConfirmation', defendantNameConfirmationErrorValidation, () =>
      performAction('confirmDefendantDetails', {
        question: defendantNameConfirmation.mainHeader,
        option: defendantNameConfirmation.noRadioOption,
        fName: defendantNameConfirmation.firstNameInputText,
        lName: defendantNameConfirmation.lastNameInputText,
      })
    );

    await softEmv.emvThen('defendantDateOfBirth', defendantDateOfBirthErrorValidation, () =>
      performAction('enterDateOfBirthDetails', {
        dobDay: defendantDateOfBirth.dayInputText,
        dobMonth: defendantDateOfBirth.monthInputText,
        dobYear: defendantDateOfBirth.yearInputText,
      })
    );

    await softEmv.emvThen('correspondenceAddressKnown', correspondenceAddressKnownErrorValidation, () =>
      performAction('selectCorrespondenceAddressKnown', {
        radioOption: correspondenceAddress.yesRadioOption,
      })
    );

    await softEmv.emvThen('contactPreferenceEmailOrPost', contactPreferenceEmailOrPostErrorValidation, () =>
      performAction('selectContactPreferenceEmailOrPost', {
        question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
        radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
      })
    );

    await softEmv.emvThen('contactPreferencesTelephone', contactPreferencesTelephoneErrorValidation, () =>
      performAction('selectContactByTelephone', {
        radioOption: contactPreferencesTelephone.noRadioOption,
      })
    );

    await softEmv.readOnlyThen('disputeClaimInterstitial', () =>
      performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect)
    );

    await softEmv.emvThen('tenancyTypeDetails', tenancyTypeDetailsErrorValidation, () =>
      performAction('tenancyOrContractTypeDetails', {
        tenancyType: submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence,
        tenancyOption: tenancyTypeDetails.noRadioOption,
        tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
      })
    );

    await softEmv.emvThen('tenancyDateDetails', tenancyDateDetailsErrorValidation, () =>
      performAction('selectTenancyStartDateKnown', { option: tenancyDateDetails.yesRadioOption })
    );

    // confirmationOfNoticeGiven EMV deferred — HDPI-6087
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');

    await softEmv.emvThen('rentArrears', rentArrearsErrorValidation, () =>
      performAction('rentArrears', { option: rentArrears.yesRadioOption })
    );

    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);

    await softEmv.readOnlyThen('PaymentInterstitial', () => performAction('readPaymentInterstitial'));

    await softEmv.emvThen('repaymentsMade', repaymentsMadeErrorValidation, () =>
      performAction('repaymentsMade', {
        question: repaymentsMade.getmainHeader(claimantName),
        repaymentOption: repaymentsMade.noRadioOption,
      })
    );

    await softEmv.emvThen('repaymentsAgreed', repaymentsAgreedErrorValidation, () =>
      performAction('repaymentsAgreed', {
        question: repaymentsAgreed.getMainHeader(claimantName),
        repaymentAgreedOption: repaymentsAgreed.yesRadioOption,
        repaymentAgreedInfo: repaymentsAgreed.detailsTextInput,
      })
    );

    await softEmv.readOnlyThen('YourHouseholdAndCircumstances', () => performAction('readYourHouseholdAndCircumstances'));

    await softEmv.emvThen('doYouHaveAnyDependantChildren', doYouHaveAnyDependantChildrenErrorValidation, () =>
      performAction('doYouHaveAnyDependantChildren', {
        dependantChildrenOption: doYouHaveAnyDependantChildren.yesRadioOption,
        dependantChildrenInfo: doYouHaveAnyDependantChildren.detailsTextInput,
      })
    );

    await softEmv.emvThen('doYouHaveAnyOtherDependants', doYouHaveAnyOtherDependantsErrorValidation, () =>
      performAction('doYouHaveAnyOtherDependants', {
        otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
        otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
      })
    );

    await softEmv.emvThen('doAnyOtherAdultsLiveInYourHome', doAnyOtherAdultsLiveInYourHomeErrorValidation, () =>
      performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
        radioOption: doAnyOtherAdultsLiveInYourHome.noRadioOption,
      })
    );

    await softEmv.emvThen(
      'wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome',
      wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation,
      () =>
        performAction('selectAlternativeAccommodation', {
          radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.noRadioOption,
        })
    );

    await softEmv.emvThen('yourCircumstances', yourCircumstancesErrorValidation, () =>
      performAction('yourCircumstances', {
        question: yourCircumstances.mainHeader,
        yourCircumstancesOption: yourCircumstances.noRadioOption,
      })
    );

    await softEmv.emvThen('exceptionalHardship', yourExceptionalHardShipErrorValidation, () =>
      performAction('exceptionalHardship', {
        question: exceptionalHardship.mainHeader,
        exceptionalHardshipOption: exceptionalHardship.noRadioOption,
      })
    );

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

    await softEmv.emvThen('languageUsed', languageUsedErrorValidation, () =>
      performAction('languageUsed', {
        question: languageUsed.mainHeader,
        radioOption: languageUsed.englishRadioOption,
      })
    );

    await softEmv.assertFailedStepsAtEnd();
  });
});
