import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import {
  askTheCourtToMakeAnOrder,
  checkYourAnswers,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelp,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
import { checkYourAnswers, chooseAnApplication } from '../../data/page-data/genApps-page-data';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadDefault });
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction(
    'navigateToUrl',
    home_url + `/case/${process.env.CASE_NUMBER}/make-an-application/choose-an-application`
  );
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey @nightly', async () => {
  test('Select an Application - Something else @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.somethingElseRadioOption,
    });
    await performValidation('mainHeader', checkYourAnswers.mainHeader);
    await performAction('clickButton', checkYourAnswers.submitApplicationButton);
  });
  //The below page are placeholder page
  await performValidation('mainHeader', askTheCourtToMakeAnOrder.mainHeader);
  await performAction('clickButton', askTheCourtToMakeAnOrder.startNowButton);
  await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
  await performAction('clickRadioButton', doYouNeedHelpPayingTheFee.yesRadioOption);
  await performAction('clickButton', doYouNeedHelpPayingTheFee.continueButton);
  await performValidation('mainHeader', haveYouAlreadyAppliedForHelp.mainHeader);
  await performAction('clickRadioButton', haveYouAlreadyAppliedForHelp.yesRadioOption);
  await performAction(
    'inputText',
    haveYouAlreadyAppliedForHelp.hwfReferenceHiddenTextLabel,
    haveYouAlreadyAppliedForHelp.hwfReferenceTextInput
  );
  await performAction('clickButton', haveYouAlreadyAppliedForHelp.continueButton);
  await performValidation('mainHeader', haveTheOtherPartiesAgreedToThisApplication.mainHeader);
  await performAction('clickRadioButton', haveTheOtherPartiesAgreedToThisApplication.yesRadioOption);
  await performAction('clickButton', haveTheOtherPartiesAgreedToThisApplication.continueButton);
  await performValidation('mainHeader', whatOrderDoYouWantTheCourtToMakeAndWhy.mainHeader);
  await performAction('clickButton', whatOrderDoYouWantTheCourtToMakeAndWhy.continueButton);
  await performValidation('mainHeader', doYouWantToUploadDocumentToSupportYourApplication.mainHeader);
  await performAction('clickRadioButton', doYouWantToUploadDocumentToSupportYourApplication.yesRadioOption);
  await performAction('clickButton', doYouWantToUploadDocumentToSupportYourApplication.continueButton);
  await performValidation('mainHeader', uploadDocumentsToSupportYourApplication.mainHeader);
  await performAction('clickButton', uploadDocumentsToSupportYourApplication.continueButton);
  await performValidation('mainHeader', whichLanguageDidYouUseToCompleteThisService.mainHeader);
  await performAction('clickButton', whichLanguageDidYouUseToCompleteThisService.continueButton);
  await performValidation('mainHeader', checkYourAnswers.mainHeader);
  await performAction('clickButton', checkYourAnswers.submitApplicationButton);
});
