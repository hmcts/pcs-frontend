import { test } from '@playwright/test';
import config from 'config';

import { initializeExecutor, performAction } from '../../utils/controller';
import { PageContentValidation } from '../../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('navigateToUrl', home_url);
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('login');
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Error page to indicate Page Not Found error @PR @nightly', () => {
  test('Content Validation on Page not found page', async () => {
    await performAction('navigateToUrl', home_url + '/page-not-found');
  });
});
