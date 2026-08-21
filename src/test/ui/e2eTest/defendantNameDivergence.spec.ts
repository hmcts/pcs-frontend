import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { defendantNameCapture, defendantNameConfirmation, freeLegalAdvice, startNow } from '../data/page-data';
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

async function submitResponse(): Promise<void> {
  await performAction('navigateToUrl', `${home_url}/case/${process.env.CASE_NUMBER}/final-submit`);
  await performValidation('mainHeader', finalSubmitPage.mainHeader);
  await performAction('clickButton', finalSubmitPage.submitButton);
}

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'YES';
  process.env.TENANCY_TYPE = 'DEMOTED_TENANCY';
  process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';

  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });

  if (testInfo.title.includes('@nameUnknown')) {
    // Single defendant the claimant could not name (nameKnown: 'NO').
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  } else {
    // Defendants the claimant did name (nameKnown: 'YES'), so the defendant is asked to confirm.
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayload.claimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'NO';
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  }

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
    await submitResponse();

    await performAction('fetchDefendantNameReportAPI');
    await performValidation('defendantNameConsistency', { expectedName: suppliedName });
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
