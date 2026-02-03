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
    await performValidation('mainHeader', tenancyDetails.mockText);
  });

  // Wales postcode routing is not implemented yet, launch darkly flags are used as of now
  test('Respond to a claim - Wales postcode', async () => {
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
    await performValidation('mainHeader', tenancyDetails.mockText);
  });
});
