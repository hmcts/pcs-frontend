import {
  defendantDateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  freeLegalAdvice,
  startNow,
} from '../data/page-data';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

/**
 * HDPI-7686 - the defence pack coversheet did not show the name the defendant supplied.
 *
 * The coversheet name is resolved from the party record alone (RecipientAddressResolver.resolveDisplayName,
 * reached from PackRecipientResolver), whereas the enclosed defence form prefers the defendant's own
 * DEFENDANT_NAME party-attribute assertion (DefenceFormPayloadBuilder.resolveDefendantName). Both journeys
 * below make the defendant supply their own name, which is exactly when the two sources can disagree.
 *
 * Both symptoms were fixed by pcs-api#2114 in ClaimResponseService.updatePartyContactDetails:
 *   Issue 1 - claimant could not name the defendant. Without the fix nameKnown stays NO and the coversheet
 *             prints "Persons unknown" even though the supplied name is stored.
 *   Issue 2 - defendant corrects a claimant-supplied name. Without the fix the update is skipped entirely
 *             (defendantNameConfirmation is NO, not null) and the coversheet keeps the claimant's name.
 *
 * These tests assert the fixed behaviour, so they pass against a pcs-api that contains #2114 and fail against
 * one that does not. Only the letterId is persisted when a pack is posted, so the printed name cannot be read
 * back from the case; pcs-api exposes the resolved names through /testing-support/defendant-name-divergence,
 * and the check also asserts against any pack already dispatched when bulk print is enabled.
 */

/**
 * The citizen check-your-answers page is still a placeholder with no submit control, so the response is
 * completed through the development final-submit page (src/main/routes/finalSubmit.ts), which fires the same
 * respondPossessionClaim CCD event the real journey will.
 */
const finalSubmitPage = {
  mainHeader: 'Submit Response',
  submitButton: 'Submit',
};

/** Both name pages capture this name, so it is what the coversheet and the defence form should both carry. */
const suppliedName = `${defendantNameCapture.firstNameTextInput} ${defendantNameCapture.lastNameTextInput}`;

/**
 * The claimant's case comes from pcs-api's testing-support orchestrator rather than the shared createCase /
 * submitCase payloads in this repo, which no longer match the case type: submitting them returns an opaque CCD
 * 404 ("No field found") because they still carry notice_Notice* keys (renamed to notice_PostedDate /
 * notice_ServiceMethod in pcs-api #1061) and the deprecated, ACL-less claimingCostsWanted and
 * rentSectionPaymentFrequency. Only the defendant's name matters here, so the base payload is taken as-is and
 * merged with a defendant1 override.
 */
const claimantName = 'Possession Claims Solicitor Org';

/**
 * Claimant named this defendant, so the defendant is asked to confirm the name and can dispute it. The name
 * has to differ from the one the defendant then supplies, otherwise "kept the old name" and "wrote the new
 * name" look identical in the report.
 */
const defendantNamedByClaimant = { defendant1: { nameKnown: 'YES', firstName: 'Jane', lastName: 'Roe' } };

/** Claimant could not name this defendant, so the defendant is asked for their name outright. */
const defendantNotNamedByClaimant = { defendant1: { nameKnown: 'NO', firstName: null, lastName: null } };

/**
 * One defendant per case. Two defendants responding to the same case on a preview trips a Hibernate
 * "Duplicate row was found and `ASSERT` was specified" fault in DefendantResponseService, which fails the
 * submit with a 502 for reasons unrelated to the name being checked here.
 */

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

async function submitResponse(): Promise<void> {
  await performAction('navigateToUrl', `${home_url}/case/${process.env.CASE_NUMBER}/final-submit`);
  await performValidation('mainHeader', finalSubmitPage.mainHeader);
  await performAction('clickButton', finalSubmitPage.submitButton);
}

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  // Matches the testing-support base payload, so the page content assertions line up with the created case.
  process.env.CLAIMANT_NAME = claimantName;
  process.env.CLAIMANT_NAME_OVERRIDDEN = 'NO';
  process.env.NOTICE_SERVED = 'NO';
  process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';

  // Only the disputed-name journey needs the claimant to have named the defendant; every other test here goes
  // down the name-capture path, which is only reachable when the claimant could not name them.
  const claimantNamedDefendant = testInfo.title.includes('@nameDisputed');
  await performAction(
    'createTestCaseAPI',
    claimantNamedDefendant ? defendantNamedByClaimant : defendantNotNamedByClaimant
  );
  await performAction('payClaimFeeAPI');

  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Defendant name on the defence pack coversheet @hdpi7686', async () => {
  test('Coversheet shows the name the defendant gave when the claimant did not know it @nameUnknown @hdpi7686 @PR', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    // The claimant supplied no name, so the defendant is asked for one outright.
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    // defendant-name-capture writes only defendantContactDetails, so without a page that writes
    // defendantResponses the submit is rejected outright with "missing defendant response data".
    await enterDateOfBirth();
    await submitResponse();

    await performAction('fetchDefendantNameReportAPI');
    await performValidation('defendantNameConsistency', { expectedName: suppliedName });
  });

  test('Coversheet shows the corrected name when the defendant disputes the claimant name @nameDisputed @hdpi7686 @PR', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    // The claimant named this defendant Jane Roe; they say it is wrong and supply their own name.
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });
    await enterDateOfBirth();
    await submitResponse();

    await performAction('fetchDefendantNameReportAPI');
    await performValidation('defendantNameConsistency', { expectedName: suppliedName });
  });
});
