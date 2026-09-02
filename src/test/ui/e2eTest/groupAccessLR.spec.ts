import type { BrowserContext, Page } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  checkYourAnswersRTC,
  startNow as citizenStartNow,
  doYouHaveASolicitor,
  freeLegalAdvice,
} from '../data/page-data';
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

async function validateSolicitorCannotAccessCase(
  page: Page,
  context: BrowserContext,
  solicitorEmail: string
): Promise<void> {
  await clearBrowserSession(page, context);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login', solicitorEmail);
  await performValidation('mainHeader', 'You do not have access to this page');
}

async function validateCitizenCannotAccessCase(page: Page, context: BrowserContext): Promise<void> {
  await clearBrowserSession(page, context);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('login');
  await performValidation('mainHeader', 'You do not have access to this page');
}

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-lr-enabled');

  const isSingleDefendantTest = testInfo.title.includes('@singleDefendant');
  const isMixedOrganisationTest = testInfo.title.includes('@mixedOrganisation');
  const isNocRevocationTest = testInfo.title.includes('@nocRevocation');
  const isDraftRevocationTest = testInfo.title.includes('@draftRevocation');
  const isCitizenDraftRevocationTest = testInfo.title.includes('@citizenDraftRevocation');
  const shouldManuallyLinkDefendants =
    isMixedOrganisationTest || isNocRevocationTest || isDraftRevocationTest || isCitizenDraftRevocationTest;
  process.env.NOTICE_SERVED = isSingleDefendantTest ? 'NO' : 'YES';
  process.env.TENANCY_TYPE = isSingleDefendantTest
    ? submitCaseApiData.submitCaseDefendantAddressKnown.tenancy_TypeOfTenancyLicence
    : 'INTRODUCTORY_TENANCY';
  process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';

  const submitCasePayload = isSingleDefendantTest
    ? submitCaseApiData.submitCaseDefendantAddressKnown
    : submitCaseApiData.submitCasePayload;

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

test.describe('Legal representative organisation access after Notice of Change @nightly', async () => {
  test('All representatives in the linked organisation can respond for a multi-defendant case @LR', async ({
    page,
    context,
  }) => {
    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    const pinUser = await getPinUserAt(0);
    await performAction('representationLR', {
      question: selectDefendant.whichDefendantQuestion,
      radioOption: `${pinUser.firstName} ${pinUser.lastName}`,
    });

    await validateSolicitorCannotAccessCase(page, context, user.defendantSolicitor3.email);
  });

  test('All representatives in the linked organisation can respond for a single-defendant case @LR @singleDefendant', async ({
    page,
    context,
  }) => {
    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await validateSolicitorCannotAccessCase(page, context, user.defendantSolicitor3.email);
  });

  test('Representatives can only respond for defendants linked to their organisation @LR @mixedOrganisation @healthCheck', async ({
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
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));
    await performValidation('elementNotToBeVisible', 'Peter Parker');
    await performAction('confirmDefendantDetailsLR', {
      question: defendantNameConfirmation.mainHeader('Test', 'John'),
      option: defendantNameConfirmation.yesRadioOption,
    });

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor3.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Peter', 'Parker'));
    await performAction('confirmDefendantDetailsLR', {
      question: defendantNameConfirmation.mainHeader('Peter', 'Parker'),
      option: defendantNameConfirmation.yesRadioOption,
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
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));

    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor3.email,
      password: user.defendantSolicitor3.password,
      defendantIndex: 0,
    });

    await validateSolicitorCannotAccessCase(page, context, user.defendantSolicitor2.email);

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor3.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));
    await performAction('confirmDefendantDetailsLR', {
      question: defendantNameConfirmation.mainHeader('Test', 'John'),
      option: defendantNameConfirmation.yesRadioOption,
    });

    await validateSolicitorCannotAccessCase(page, context, user.defendantSolicitor2.email);
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
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));
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

    await validateSolicitorCannotAccessCase(page, context, user.defendantSolicitor2.email);

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor3.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));
    await performValidation('radioButtonChecked', defendantNameConfirmation.noRadioOption, false);
  });

  //Skipping this test untill issue mentioned on HDPI-6936 ticket is resolved
  test.skip('Citizen draft is deleted when Notice of Change gives access to the legal representative organisation @LR @citizenDraftRevocation', async ({
    page,
    context,
  }) => {
    await performAction('createUser', 'citizen', ['citizen']);
    await performAction('validateAccessCodeAPI');

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url);
    await performAction('login');
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('clickButton', citizenStartNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('selectDoYouHaveASolicitor', doYouHaveASolicitor.noRadioOption);
    await performAction('retrieveCYATableDataRTC', 'startNowAndDetails');
    await performAction('validateRTCSectionCYA', 'startNowAndDetails');
    await performAction('clickButton', checkYourAnswersRTC.saveAndContinueButton);

    await performAction('linkDefendantToSolicitorForCaseAPI', {
      req: 'Link Solicitor',
      email: user.defendantSolicitor.email,
      password: user.defendantSolicitor.password,
      defendantIndex: 0,
    });

    await validateCitizenCannotAccessCase(page, context);

    await clearBrowserSession(page, context);
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('login', user.defendantSolicitor2.email);
    await performAction('clickButton', startNow.startNowButton);
    await performValidation('mainHeader', defendantNameConfirmation.mainHeader('Test', 'John'));
    await performValidation('radioButtonChecked', defendantNameConfirmation.noRadioOption, false);
  });
});
