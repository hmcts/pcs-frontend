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
 * HDPI-7686 - the name on the bulk-print coversheet does not match the name on the enclosed defence form.
 *
 * The coversheet name is resolved from the party record alone (RecipientAddressResolver.resolveDisplayName,
 * reached from PackRecipientResolver), whereas the defence form prefers the defendant's own DEFENDANT_NAME
 * party-attribute assertion (DefenceFormPayloadBuilder.resolveDefendantName). Both journeys below make the
 * defendant supply their own name, which is exactly when the two sources can disagree.
 *
 * Only the letterId is persisted when a pack is posted, so the printed name cannot be read back from the case.
 * Instead pcs-api exposes both resolved names through /testing-support/defendant-name-divergence, which lets
 * these tests compare them without depending on bulk print or the send-letter service.
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

/** Claimant named this defendant, so the defendant is asked to confirm the name and can dispute it. */
const defendantNamedByClaimant = { defendant1: { nameKnown: 'YES', firstName: 'Jane', lastName: 'Doe' } };

/** Claimant could not name this defendant, so the defendant is asked for their name outright. */
const defendantNotNamedByClaimant = { defendant1: { nameKnown: 'NO', firstName: null, lastName: null } };

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

test.describe('Defendant name on the coversheet vs the defence form @hdpi7686', async () => {
  test('Names match when the claimant did not know the defendant name @nameUnknown @hdpi7686 @PR', async () => {
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

  /**
   * Isolates why the name-unknown journey above cannot carry the defendant's name to submission.
   * Each page saves its draft through RespondToPossessionDraftSavePage, which calls
   * DraftCaseDataService.saveUnsubmittedEventData - the replacing variant. Every other draft writer in pcs-api
   * uses patchUnsubmittedEventData, which merges. CCD also swaps the whole possessionClaimResponse case field
   * rather than deep-merging it, so the draft ends up holding only the page just saved and the name captured
   * two pages earlier is gone.
   */
  test('The name the defendant supplied survives the next page @draftLoss @hdpi7686 @PR', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
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

  test('Names match when the defendant disputes the claimant-supplied name @nameDisputed @hdpi7686 @PR', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    // The claimant named this defendant, who says the name is wrong and supplies their own.
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });
    await submitResponse();

    await performAction('fetchDefendantNameReportAPI');
    await performValidation('defendantNameConsistency', { expectedName: suppliedName });
  });
});
