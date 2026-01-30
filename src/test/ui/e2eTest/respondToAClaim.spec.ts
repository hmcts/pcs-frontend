import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  correspondenceAddressKnown,
  dateOfBirth,
  defendantNameCapture,
  disputeClaimInterstitial,
  freeLegalAdvice,
  startNow,
} from '../data/page-data';
import { registeredLandlord } from '../data/page-data/registeredLandlord.page.data';
import { tenancyDetails } from '../data/page-data/tenancyDetails.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  //await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  //await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim @nightly', async () => {
  test('Respond to a claim - England postcode', async () => {
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('clickButton', startNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performValidation('mainHeader', correspondenceAddressKnown.mainHeader);
    await performAction('clickRadioButton', 'Yes');
    await performAction('clickButton', correspondenceAddressKnown.saveAndContinueButton);
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mockText);
  });

  // Wales postcode routing is not implemented yet, launch darkly flags are used as of now
  test.skip('Respond to a claim - Wales postcode', async () => {
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('clickButton', startNow.startNowButton);
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
    await performValidation('mainHeader', correspondenceAddressKnown.mainHeader);
    await performAction('clickRadioButton', 'Yes');
    await performAction('clickButton', correspondenceAddressKnown.saveAndContinueButton);
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', registeredLandlord.mockText);
  });
});
