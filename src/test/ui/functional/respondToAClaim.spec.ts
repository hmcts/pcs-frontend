import { test } from '@playwright/test';
import config from 'config';

//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
// eslint-disable-next-line import/no-duplicates
import { dateOfBirth, defendantNameCapture, freeLegalAdvice, noticeDateKnown, noticeDateUnknown, noticeDetails, startNow, } from '../data/page-data';
//Below lines are commented to avoid API calls until data setup is integrated.
//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
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
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  //Below hard coded case number will be replaced with actual case number once data setup is integrated.
  await performAction('navigateToUrl', home_url + '/case/1234123412341234/respond-to-claim/start-now');
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim - functional @nightly', async () => {
  test('Free legal advice - Error messages - Save for later Validations', async () => {
    await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: freeLegalAdvice.errorValidation,
      validationType: freeLegalAdvice.errorValidationType.radio,
      inputArray: freeLegalAdvice.errorValidationField.errorRadioMsg,
      question: freeLegalAdvice.haveYouHadAnyFreeLegalAdviceQuestion,
      header: freeLegalAdvice.errorValidationHeader,
    });
    await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', defendantNameCapture.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Defendant name capture - Error messages - save for later Validations', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: defendantNameCapture.errorValidation,
      validationType: defendantNameCapture.errorValidationType.input,
      inputArray: defendantNameCapture.errorValidationField.errorTextField,
      header: defendantNameCapture.errorValidationHeader,
    });
    await performAction('inputText', defendantNameCapture.firstNameLabelText, 'John');
    await performAction('inputText', defendantNameCapture.lastNameLabelText, 'Doe');
    await performAction('clickButton', defendantNameCapture.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Defendant Date of birth - Error messages - save for later Validations', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performAction('clickButton', dateOfBirth.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: dateOfBirth.errorValidation,
      validationType: dateOfBirth.errorValidationType.input,
      inputArray: dateOfBirth.errorValidationField.errorTextField,
      header: dateOfBirth.errorValidationHeader,
    });
  });

  test('Claimant selected No to Have you served notice - Notice details screen not shown ', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //Notice details screen not shown ??progress to rent arrears or non-rent arrears screen if claim is rent / non-rent arrears respectfully
  });

  test('tenancy date details - Select Yes on Notice details screen and claimant provided notice date', async () => {
    //steps to progress to Screen 1 or Screen 2
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('clickRadioButton', defendantNameCapture.yesRadioOption);
    await performAction ('clickButton', defendantNameCapture.saveAndContinueButton);
    await performAction('enterDateOfBirthDetails', {
      whatsYouDOB: dateOfBirth.mainHeader,
      day: '16', month: '07', year: '2000' });
    await performAction('clickRadioButton', 'yes');
    await performAction('clickButton', 'Save and continue');
    await performAction('clickButton','Continue');
    //tenancy
    await performAction('clickButton', 'Save and continue');
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'legend'
    });
    await performAction('selectNoticeDetails', 'noticeDetails.yesRadioOption');
    await performValidation('mainHeader', noticeDateKnown.mainHeader);
    await performAction('enterNoticeDateKnown', {
      day: '24',
      month: '2',
      year: '2020'
    });
  });

  test('tenancy date details - Select Yes on Notice details screen and claimant did not provide notice date', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //steps to progress to Screen 1 or Screen 2
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'inlineText'
    });
    await performAction('selectNoticeDetails', noticeDetails.yesRadioOption);
    await performAction('mainHeader', noticeDateUnknown.mainHeader);
    await performAction('enterNoticeDateUnknown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    // progress to rent arrears or non-rent arrears screen?????
  });

  test('tenancy date unknown - Select No on Notice details screen ', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //steps to progress to Screen 1 or Screen 2
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'inlineText'
    });
    await performAction('selectNoticeDetails', noticeDetails.noRadioOption);
    await performAction('mainHeader', noticeDateUnknown.mainHeader);
    await performAction('enterNoticeDateUnknown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    //progress to rent arrears or non-rent arrears screen if claim is rent / non-rent arrears respectfully
  });



  test('Select Im not sure on Notice date', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //steps to progress to Screen 1 or Screen 2
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'inlineText'
    });
    await performAction('selectNoticeDetails', noticeDetails.imNotSureRadioOption);
    await performAction('mainHeader', noticeDateKnown.mainHeader);
    await performAction('enterNoticeDateKnown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    //progress to rent arrears or non-rent arrears screen if claim is rent / non-rent arrears respectfully
  });

});
