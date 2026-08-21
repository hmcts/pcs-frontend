import { type Page, expect } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  dashboard,
  defendantDateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  taskList,
} from '../data/page-data';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

/**
 * HDPI-7686 - the defence pack coversheet does not show the defendant name the defendant entered.
 *
 * The ticket reports two cases, both on a case with more than one defendant:
 *   Issue 1 - the claimant could not name the defendant, the defendant enters a name, and the coversheet still
 *             reads "Persons unknown".
 *   Issue 2 - the claimant named the defendant, the defendant corrects it, and the coversheet still reads the
 *             old name.
 *
 * A defence pack is posted to every party on the claim, not just the responder (DefencePackSelector adds each
 * defence form to every claimant and defendant), and each recipient's coversheet is addressed with that
 * recipient's own name. The ticket's steps download every letter id on the case, so that batch also contains
 * copies addressed to the claimant and to defendants who have not responded - whose coversheets legitimately
 * carry other names. These tests therefore check the copy addressed to the responder specifically, identified
 * by the recorded PackDocumentRef.self.
 *
 * The printed name is not stored, so pcs-api exposes the dispatched packs and their recipients through
 * /testing-support/defendant-name-divergence, which is the same claim_activity_log data the ticket reads letter
 * ids from.
 */

/** Both name pages capture this name, so it is what the responder's own coversheet should carry. */
const suppliedName = `${defendantNameCapture.firstNameTextInput} ${defendantNameCapture.lastNameTextInput}`;

/**
 * Issue 1 needs the claimant to have been unable to name defendant 1, which no shared payload does while also
 * carrying additional defendants - so the standard payload's defendant1 name fields are cleared. Everything
 * else, including the addresses the page content assertions rely on, is left untouched.
 */
const claimantCouldNotNameDefendant1 = () => ({
  ...submitCaseApiData.submitCasePayload,
  defendant1: {
    ...submitCaseApiData.submitCasePayload.defendant1,
    nameKnown: 'NO',
    firstName: null,
    lastName: null,
  },
});

/**
 * The date-of-birth page is the first page after both name pages. A date has to be supplied because the step
 * only saves a draft when day, month and year are all present.
 */
async function enterDateOfBirth(): Promise<void> {
  await performAction('enterDateOfBirthDetails', {
    dobDay: defendantDateOfBirth.dayInputText,
    dobMonth: defendantDateOfBirth.monthInputText,
    dobYear: defendantDateOfBirth.yearInputText,
  });
}

/**
 * Fires respondPossessionClaim the same way the check-your-answers page does, by posting the statement of truth
 * to the final-submit route (src/main/routes/finalSubmit.ts). That route is POST-only and the citizen journey
 * only reaches it once every section is complete, which is far more journey than these name checks need. The
 * post goes through the page's request context so it carries the logged-in session, and the CSRF token is read
 * from the form on the page the journey is currently sitting on.
 */
async function submitResponse(page: Page): Promise<void> {
  const csrfToken = await page.locator('input[name="_csrf"]').first().inputValue();

  const response = await page.request.post(`${home_url}/case/${process.env.CASE_NUMBER}/final-submit`, {
    form: {
      _csrf: csrfToken,
      statementOfTruthContempt: 'yes',
      statementOfTruthBelief: 'yes',
      fullName: suppliedName,
    },
  });

  expect(response.status(), `final-submit returned ${response.status()}: ${await response.text()}`).toBeLessThan(400);
}

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  await performAction('skipTestIfLdFlagDisabled', 'cui-respond-to-claim-enabled');
  process.env.WALES_POSTCODE = 'NO';
  process.env.NOTICE_SERVED = 'YES';
  process.env.RENT_ARREARS = 'NO';
  // submitCasePayload reads this; leaving it unset sends a null tenancy type, which pcs-api answers with a 502.
  process.env.TENANCY_TYPE = 'DEMOTED_TENANCY';

  /**
   * Only the disputed-name journey needs the claimant to have named the defendant. Every other test here goes
   * down defendant-name-capture, which is reachable only when the claimant could not name them - that is what
   * submitCasePayloadNoDefendants sets up (defendant1.nameKnown: 'NO').
   */
  process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayload.claimantName;
  process.env.CLAIMANT_NAME_OVERRIDDEN = 'NO';
  process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';

  const claimantNamedDefendant = testInfo.title.includes('@nameDisputed');
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', {
    data: claimantNamedDefendant ? submitCaseApiData.submitCasePayload : claimantCouldNotNameDefendant1(),
  });
  await performAction('updatePaymentAPI');

  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/dashboard`);
  await performAction('clickButton', dashboard.startYourResponseLink);
  await performValidation('mainHeader', taskList.mainHeader);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Defendant name on the coversheet vs the defence form @hdpi7686', async () => {
  // Issue 1: the claimant could not name this defendant, who supplies one; their coversheet must not say
  // "Persons unknown".
  test('The coversheet carries the name a defendant the claimant could not name supplied @nameUnknown @hdpi7686 @PR', async ({
    page,
  }) => {
    // The journey is a task list now, so the name pages are reached through their own section.
    await performAction('taskList', { subSection: taskList.confirmDetailsLink });
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await enterDateOfBirth();
    await submitResponse(page);

    await performAction('waitForDefencePackAPI');
    await performValidation('defendantNameConsistency', { expectedName: suppliedName });
  });

  /**
   * Isolates why the name-unknown journey above cannot carry the defendant's name to submission.
   * Each page saves its draft through RespondToPossessionDraftSavePage, which calls
   * DraftCaseDataService.saveUnsubmittedEventData - the replacing variant. Every other draft writer in pcs-api
   * uses patchUnsubmittedEventData, which merges. CCD also swaps the whole possessionClaimResponse case field
   * rather than deep-merging it, so the draft ends up holding only the page just saved and the name captured
   * two pages earlier is gone.
   */
  test('The name the defendant supplied survives the next page @draftLoss @hdpi7686 @PR', async () => {
    await performAction('taskList', { subSection: taskList.confirmDetailsLink });
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await enterDateOfBirth();

    await performAction(
      'navigateToUrl',
      `${home_url}/case/${process.env.CASE_NUMBER}/respond-to-claim/defendant-name-capture`
    );
    await performValidation('mainHeader', defendantNameCapture.mainHeader);
    // There is no claimant-entered name to fall back on for this journey, so an empty field means the
    // defendant's own answer has been dropped rather than merely re-derived.
    await performValidation(
      'inputTextValue',
      defendantNameCapture.firstNameTextLabel,
      defendantNameCapture.firstNameTextInput
    );
    await performValidation(
      'inputTextValue',
      defendantNameCapture.lastNameTextLabel,
      defendantNameCapture.lastNameTextInput
    );
  });

  // Issue 2: the claimant named this defendant, who corrects it; their coversheet must carry the new name.
  test('The coversheet carries the corrected name when the defendant disputes it @nameDisputed @hdpi7686 @PR', async ({
    page,
  }) => {
    await performAction('taskList', { subSection: taskList.confirmDetailsLink });
    // The claimant named this defendant, who says the name is wrong and supplies their own.
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });
    await enterDateOfBirth();
    await submitResponse(page);

    await performAction('waitForDefencePackAPI');
    await performValidation('defendantNameConsistency', { expectedName: suppliedName });
  });
});
