import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import {
  askTheCourtToSetAsideTheOrder,
  checkYourAnswers,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelpWithFees,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
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
  test('Select an Application - Ask to Set aside @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
    //The below are placeholder pages
    await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
    await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFee.iNeedHelpPayingTheFeeRadioOption,
    });
    await performValidation('mainHeader', haveYouAlreadyAppliedForHelpWithFees.mainHeader);
    await performAction('confirmYouHaveAppliedForFeeHelp', {
      question: haveYouAlreadyAppliedForHelpWithFees.haveYouAlreadyAppliedForHelpQuestion,
      option: haveYouAlreadyAppliedForHelpWithFees.yesRadioOption,
      label: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceHiddenTextLabel,
      input: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceTextInput,
    });
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
});
