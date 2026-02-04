import { test } from '@playwright/test';
import config from 'config';

//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactPreference,
  correspondenceAddressKnown,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  disputeClaimInterstitial,
  freeLegalAdvice,
  registeredLandlord,
  repayments,
  startNow,
  tenancyDetails,
} from '../data/page-data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  //await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  //await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  //await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  //await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url + '/case/1234567891234567/respond-to-claim/start-now');
  await performAction('login');
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - England postcode', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddressKnown.yesRadioOption,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.continueButton);
    // Disabled temp as decision is pending from BA
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    // await performValidation('mainHeader', counterClaim.mainHeader);
    // await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repayments.mainHeader);
    await performAction('clickButton', repayments.saveAndContinueButton);
  });

  // Wales postcode routing is not implemented yet, e2e test coverage, functional test coverage needs to be reviewed once HDPI-3451 is done
  test.skip('Respond to a claim - Wales postcode', async () => {
    await performAction('navigateToUrl', home_url + '/case/1234123412341234/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddressKnown.noRadioOption,
      postcode: correspondenceAddressKnown.englandPostcodeTextInput,
      addressIndex: correspondenceAddressKnown.addressIndex,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', registeredLandlord.mockText);
    //Added below pages to welsh journey as per english journey
    // Disabled temp as decision is pending from BA
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    // await performValidation('mainHeader', counterClaim.mainHeader);
    // await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repayments.mainHeader);
    await performAction('clickButton', repayments.saveAndContinueButton);
  });
});
