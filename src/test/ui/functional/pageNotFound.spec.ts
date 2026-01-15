import { test } from '@playwright/test';
import config from 'config';

import { pageNotFound } from '../data/page-data/pageNotFound.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('navigateToUrl', home_url);
  await performAction('createUserAndLogin', 'citizen', ['citizen']);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe.skip('Error page to indicate Page Not Found error @PR @nightly', () => {
  test('Error page is displayed when invalid step URL is accessed', async () => {
    await performAction('navigateToUrl', home_url + '/page-not-found');
    await performAction('clickSummary', pageNotFound.contactUsForHelpSummary);
    await performValidation('text', 'ifYouNeedHelpText', {
      elementType: 'summaryText',
      text: pageNotFound.ifYouNeedHelpTextHidden,
    });
  });
});
