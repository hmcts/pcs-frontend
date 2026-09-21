import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-enabled');
  process.env.NOTICE_SERVED = 'YES';
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
  await performAction('navigateToUrl', home_url);
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('login');
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Error page to indicate Page Not Found error @nightly', () => {
  test('Content Validation on Page not found page', async () => {
    await performAction('navigateToUrl', home_url + '/page-not-found');
  });

  test('Invalid caseId validation', async () => {
    await performAction('navigateToUrl', home_url + '/case/1234567891234567/dashboard');
    await performValidation('mainHeader', 'You do not have access to this page');
    await performValidation('text', {
      text: 'Contact us if you think you should have access, or if you need help with your case.',
      elementType: 'paragraph',
    });
  });

  test('Valid unmapped caseId validation', async () => {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/dashboard`);
    await performValidation('mainHeader', 'You do not have access to this page');
    await performValidation('text', {
      text: 'Contact us if you think you should have access, or if you need help with your case.',
      elementType: 'paragraph',
    });
  });
});
