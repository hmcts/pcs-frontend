import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  dateOfBirth,
  defendantNameCapture,
  freeLegalAdvice,
  landlordLicensed,
  landlordRegistered,
  startNow,
  tenancyTypeDetails,
  writtenTerms,
} from '../data/page-data';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  process.env.WALES_POSTCODE = 'YES';
  process.env.CLAIMANT_NAME = submitCaseApiDataWales.submitCasePayload.claimantName;
  await performAction('createCaseAPI', { data: createCaseApiWalesData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCasePayload });
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

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
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
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction('disputeClaimInterstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('clickButton', writtenTerms.saveAndContinueButton);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    // Commented the below lines as the wales pages of tenancy section are not implemented yet.
    /*
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadAssuredTenancy.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('enterTenancyStartDetailsUnKnown');
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.mainHeader,
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.amNotSureRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performValidation('mainHeader', doAnyOtherAdultsLiveInYourHome.mainHeader);
  */
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performValidation('mainHeader', tenancyTypeDetails.mainHeader);
  });
});
