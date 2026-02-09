import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { pageNotFound } from '../data/page-data/pageNotFound.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('navigateToUrl', home_url);
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('login');
});

test.describe('Error page to indicate Page Not Found error @PR @nightly', () => {
  test('Content Validation on Page not found page', async () => {
    await performAction('navigateToUrl', home_url + '/page-not-found');
    await performValidation('mainHeader', pageNotFound.mainHeader);
    await performValidation('text', { text: pageNotFound.thisCouldBeBecauseParagraph, elementType: 'paragraph' });
  });

  test('Invalid caseId validation', async () => {
    await performAction('navigateToUrl', home_url + '/case/1234567891234567/respond-to-claim/start-now');
    await performValidation('mainHeader', 'Sorry, we’re having technical problems');
    await performValidation('text', { text: 'Please try again in a few minutes.', elementType: 'paragraph' });
  });

  test('Valid unmapped caseId validation', async () => {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performValidation('mainHeader', 'Sorry, we’re having technical problems');
    await performValidation('text', { text: 'Please try again in a few minutes.', elementType: 'paragraph' });
  });
});
