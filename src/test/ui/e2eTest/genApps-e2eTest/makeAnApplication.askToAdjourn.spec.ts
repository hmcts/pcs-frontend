import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import {
  askToAdjournTheCourtHearing,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  haveTheOtherPartiesAgreedToThisApplication,
  isTheCourtHearingInNext14Days,
} from '../../data/page-data/genApps-page-data';
import { FieldsStore } from '../../utils/actions/custom-actions/recordAnsweredFields.action';
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
  test('Select an Application - Ask to Adjourn journey @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.delayRadioOption,
    });
    await performValidation('mainHeader', askToAdjournTheCourtHearing.mainHeader);
    await performAction('clickButton', askToAdjournTheCourtHearing.startNowButton);
    await performValidation('mainHeader', isTheCourtHearingInNext14Days.mainHeader);
    await performAction('confirmIfCourtHearingInNext14Days', {
      question: isTheCourtHearingInNext14Days.isTheCourtHearingInNext14DaysQuestion,
      option: isTheCourtHearingInNext14Days.yesRadioOption,
    });
    await performAction('clickButton', isTheCourtHearingInNext14Days.continueButton);
    if (FieldsStore.get(isTheCourtHearingInNext14Days.isTheCourtHearingInNext14DaysQuestion)) {
      await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
    } else {
      await performValidation('mainHeader', haveTheOtherPartiesAgreedToThisApplication.mainHeader);
    }


    for (const [question, answer] of FieldsStore.getAll()) {
      console.log(question, answer);
    }

    // await performValidation('mainHeader', checkYourAnswers.mainHeader);
    // await performAction('clickButton', checkYourAnswers.submitApplicationButton);
  });
});
