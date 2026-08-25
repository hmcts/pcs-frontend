import type { BrowserContext, Page } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { defendantNameConfirmation, selectDefendant, startNow } from '../data/page-data/lr-page-data';
import { user } from '../data/user-data';
import { getPinUserAt } from '../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

async function clearBrowserSession(page: Page, context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore if storage is not accessible for the current page.
    }
  });
}

async function validateGroupAccessForCase(page: Page, context: BrowserContext): Promise<void> {
  await clearBrowserSession(page, context);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor2.email);
  await performAction('clickButton', startNow.startNowButton);
  const pinUser = await getPinUserAt(0);
  await performAction('representationLR', {
    question: selectDefendant.whichDefendantQuestion,
    radioOption: `${pinUser.firstName} ${pinUser.lastName}`,
  });

  await clearBrowserSession(page, context);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', user.defendantSolicitor3.email);
  await performAction('clickButton', startNow.startNowButton);
  await performValidation('mainHeader', 'You do not have access to this page');
}

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-lr-enabled');

  const isSingleDefendantTest = testInfo.title.includes('@singleDefendant');
  const isMixedOrganisationTest = testInfo.title.includes('@mixedOrganisation');
  const isNocRevocationTest = testInfo.title.includes('@nocRevocation');
  const isDraftRevocationTest = testInfo.title.includes('@draftRevocation');
  const shouldManuallyLinkDefendants = isMixedOrganisationTest || isNocRevocationTest || isDraftRevocationTest;
  const submitCasePayload = isSingleDefendantTest
    ? submitCaseApiData.submitCaseDefendantAddressKnown
    : submitCaseApiData.submitCasePayload;

  process.env.NOTICE_SERVED = isSingleDefendantTest ? 'NO' : 'YES';
  process.env.TENANCY_TYPE = isSingleDefendantTest
    ? submitCaseApiData.submitCaseDefendantAddressKnown.tenancy_TypeOfTenancyLicence
    : 'INTRODUCTORY_TENANCY';
  process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
  process.env.CLAIMANT_NAME = submitCasePayload.claimantName;

  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCasePayload });
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  if (!shouldManuallyLinkDefendants) {
    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor.email,
      password: user.defendantSolicitor.password,
    });
  }
  logTestEnvAfterBeforeEach('Group access LR check @LR', RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS);

  if (!shouldManuallyLinkDefendants) {
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor.email);
    await performAction('clickButton', startNow.startNowButton);
  }
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Legal representative organisation access after Notice of Change @nightly @PR', async () => {
  test('All representatives in the linked organisation can respond for a multi-defendant case @LR', async ({
    page,
    context,
  }) => {
    await validateGroupAccessForCase(page, context);
  });

  test('All representatives in the linked organisation can respond for a single-defendant case @LR @singleDefendant', async ({
    page,
    context,
  }) => {
    await validateGroupAccessForCase(page, context);
  });

  test('Representatives can only respond for defendants linked to their organisation @LR @mixedOrganisation', async ({
    page,
    context,
  }) => {
    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor.email,
      password: user.defendantSolicitor.password,
      defendantIndex: 0,
    });
    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor3.email,
      password: user.defendantSolicitor3.password,
      defendantIndex: 1,
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('elementToBeVisible', 'Test John');
    await performValidation('elementNotToBeVisible', 'Peter Parker');
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: 'Test John',
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor3.email);
    await performAction('clickButton', startNow.startNowButton);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: 'Peter Parker',
    });
  });

  test('Further Notice of Change gives the new organisation access and revokes the previous organisation @LR @nocRevocation', async ({
    page,
    context,
  }) => {
    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor.email,
      password: user.defendantSolicitor.password,
      defendantIndex: 0,
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('elementToBeVisible', 'Test John');

    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor3.email,
      password: user.defendantSolicitor3.password,
      defendantIndex: 0,
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('mainHeader', 'You do not have access to this page');

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor3.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('elementToBeVisible', 'Test John');
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: 'Test John',
    });
  });

  test('Further Notice of Change removes the previous organisation draft for that defendant @LR @draftRevocation', async ({
    page,
    context,
  }) => {
    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor.email,
      password: user.defendantSolicitor.password,
      defendantIndex: 0,
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: 'Test John',
    });
    await performAction('clickRadioButton', {
      question: defendantNameConfirmation.mainHeader('Test', 'John'),
      option: defendantNameConfirmation.noRadioOption,
    });
    await performAction('inputText', defendantNameConfirmation.defendantFirstNameHiddenTextLabel, 'Old');
    await performAction('inputText', defendantNameConfirmation.defendantLastNameHiddenTextLabel, 'Draft');
    await performAction('clickButton', defendantNameConfirmation.saveForLaterButton);

    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor3.email,
      password: user.defendantSolicitor3.password,
      defendantIndex: 0,
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('mainHeader', 'You do not have access to this page');

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor3.email);
    await performAction('clickButton', startNow.startNowButton);
    await performAction('clickRadioButton', {
      question: selectDefendant.whichDefendantQuestion,
      option: 'Test John',
    });
    await performAction('clickButton', selectDefendant.saveAndContinueButton);
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));
    await performValidation('radioButtonChecked', defendantNameConfirmation.noRadioOption, false);
  });
});
