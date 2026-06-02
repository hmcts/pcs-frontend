import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { defendantDateOfBirth, defendantNameCapture, freeLegalAdvice, startNow } from '../data/page-data';
import { user } from '../data/user-data';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  await performAction('getCaseAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login', user.defendantSolicitor.email);
  await performAction('navigateToUrl', home_url + `/access-your-case`);
  await performAction('accessYourCase', { caseNumber: process.env.CASE_NUMBER });
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales - Secure contract - RentArrears and NonRentArrears - SelectCounterClaim - Yes - CounterClaimFee - INeedHelp @PR @noDefendants @smoke @regression', async () => {
    //Single named party - A sum of money or comp - specific sum of money (Yes) - counterclaimFee- I need help
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
  });
});
