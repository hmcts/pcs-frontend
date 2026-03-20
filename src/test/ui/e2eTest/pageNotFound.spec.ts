import { test } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { pageNotFound } from '../data/page-data/pageNotFound.page.data';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('navigateToUrl', home_url);
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('login');
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Error page to indicate Page Not Found error @nightly', () => {
  test('Content Validation on Page not found page @PR @crossbrowser', async () => {
    await performAction('navigateToUrl', home_url + '/page-not-found');
    await performValidation('mainHeader', pageNotFound.mainHeader);
    await performValidation('text', {
      text: pageNotFound.thisCouldBeBecauseParagraph,
      elementType: 'paragraph',
    });
  });

  // This test was written as part of the story HDPI-3883. A new story will update the error message screen with a “Contact Us” link.
  // Keeping this here for reference only — please do not enable it.
  test.skip('Invalid caseId validation', async () => {
    await performAction('navigateToUrl', home_url + '/case/1234567891234567/respond-to-claim/start-now');
    await performValidation('mainHeader', 'Sorry, we’re having technical problems');
    await performValidation('text', { text: 'Please try again in a few minutes.', elementType: 'paragraph' });
  });

  test.skip('Valid unmapped caseId validation', async () => {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performValidation('mainHeader', 'Sorry, we’re having technical problems');
    await performValidation('text', { text: 'Please try again in a few minutes.', elementType: 'paragraph' });
  });
});
