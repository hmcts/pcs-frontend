import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import {
  askToAdjournTheCourtHearing,
  checkYourAnswers,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelp,
  isTheCourtHearingInTheNext14Days,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
import { FieldsStore } from '../../utils/actions/custom-actions/recordAnsweredFields.action';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  FieldsStore.clear();
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
  test('Select an Application - Ask to Adjourn journey - Court hearing in 14 days[Yes] @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.delayRadioOption,
    });
    await performValidation('mainHeader', askToAdjournTheCourtHearing.mainHeader);
    await performAction('clickButton', askToAdjournTheCourtHearing.startNowButton);
    await performValidation('mainHeader', isTheCourtHearingInTheNext14Days.mainHeader);
    await performAction('confirmIfCourtHearingInNext14Days', {
      question: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
      option: isTheCourtHearingInTheNext14Days.yesRadioOption,
    });
    await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFee.iNeedHelpPayingTheFeeRadioOption,
    });
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

  test('Select an Application - Ask to Adjourn journey - Court hearing 14 days[No] @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.delayRadioOption,
    });
    await performValidation('mainHeader', askToAdjournTheCourtHearing.mainHeader);
    await performAction('clickButton', askToAdjournTheCourtHearing.startNowButton);
    await performValidation('mainHeader', isTheCourtHearingInTheNext14Days.mainHeader);
    await performAction('confirmIfCourtHearingInNext14Days', {
      question: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
      option: isTheCourtHearingInTheNext14Days.noRadioOption,
    });
    await performValidation('mainHeader', haveTheOtherPartiesAgreedToThisApplication.mainHeader);
  });
});
