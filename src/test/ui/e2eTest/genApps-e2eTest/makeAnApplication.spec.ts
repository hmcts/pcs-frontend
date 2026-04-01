import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import { checkYourAnswers, chooseAnApplication } from '../../data/genApps-page-data';
import { dashboard } from '../../data/page-data';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'YES';
  process.env.TENANCY_TYPE = 'ASSURED_TENANCY';
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
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
  test('Select an Application - Ask to Adjourn journey', async () => {
    await performAction('chooseAnApplication', {
        question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
        option: chooseAnApplication.delayRadioOption
      });
    await performValidation('mainHeader', checkYourAnswers.mainHeader);
    await performAction('clickButton', checkYourAnswers.submitApplicationButton);
    await performValidation('mainHeader', dashboard.mainHeader);
  });
});
