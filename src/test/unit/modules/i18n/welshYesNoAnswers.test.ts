import * as fs from 'fs';
import * as path from 'path';

// Yes/No answer wording each screen must use in Welsh, as set by the Welsh Language Unit's
// "Welsh language translations - YES-NO" sheet (29 Sep 2026). The answer form is chosen per question
// by the WLU, so do not "correct" it to match the question's grammar — change it only with their sign-off.
const WLU_YES_NO: [file: string, yesKey: string, yes: string, no: string][] = [
  // Respond to claim — citizen
  ['respondToClaim/freeLegalAdvice.json', 'options', 'Do', 'Naddo'],
  ['respondToClaim/solicitor.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/defendantNameConfirmation.json', '', 'Ie', 'Na'],
  ['respondToClaim/correspondenceAddress.json', 'labels', 'Ie', 'Na'],
  ['respondToClaim/contactPreferencesTelephone.json', 'labels.options', 'Ydw', 'Nac ydw'],
  ['respondToClaim/confirmationOfNoticeGiven.json', 'options', 'Do', 'Naddo'],
  ['respondToClaim/repaymentsMade.json', 'options', 'Do', 'Naddo'],
  ['respondToClaim/repaymentsAgreed.json', 'options', 'Do', 'Naddo'],
  ['respondToClaim/installmentPayments.json', 'options', 'Hoffwn', 'Na hoffwn'],
  ['respondToClaim/counterClaim.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/counterClaimSpecificSum.json', 'options', 'Ydw', 'Nac ydw'],
  ['respondToClaim/counterClaimHaveYouAppliedForHelp.json', 'options', 'Do', 'Naddo'],
  ['respondToClaim/counterClaimDoYouWantToUploadFiles.json', 'options', 'Ydw', 'Nac ydw'],
  ['respondToClaim/doYouHaveAnyDependantChildren.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/doYouHaveAnyOtherDependants.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/doAnyOtherAdultsLiveInYourHome.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.json', 'options', 'Byddai', 'Na fyddai'],
  ['respondToClaim/yourCircumstances.json', 'options', 'Hoffwn', 'Na hoffwn'],
  ['respondToClaim/exceptionalHardship.json', 'options', 'Byddwn', 'Na fyddwn'],
  ['respondToClaim/incomeAndExpenses.json', 'options', 'Ydw', 'Nac ydw'],
  ['respondToClaim/haveYouAppliedForUniversalCredit.json', 'options', 'Do', 'Naddo'],
  ['respondToClaim/priorityDebts.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/otherConsiderations.json', 'options', 'Oes', 'Nac oes'],
  // Respond to claim — legal representative (screens not listed here use the citizen wording above)
  ['respondToClaim/legalrep/resumeResponse.json', 'options', 'Oes', 'Nac oes'],
  ['respondToClaim/legalrep/defendantNameConfirmation.json', '', 'Ie', 'Na'],
  ['respondToClaim/legalrep/correspondenceAddress.json', 'labels', 'Ie', 'Na'],
  ['respondToClaim/legalrep/emailConfirmation.json', 'options', 'Ydw', 'Nac ydw'],
  ['respondToClaim/legalrep/tenancyDateDetails.json', 'options', 'Ydy', 'Nac ydy'],
  ['respondToClaim/legalrep/installmentPayments.json', 'options', 'Hoffai', 'Na hoffai'],
  // Make an application
  ['makeAnApplication/haveYouAlreadyAppliedForHelpWithFees.json', 'options', 'Do', 'Naddo'],
  ['makeAnApplication/areThereAnyReasonsThatThisApplicationShouldNotBeShared.json', 'options', 'Oes', 'Nac oes'],
  ['makeAnApplication/doYouWantToUploadDocumentsToSupportYourApplication.json', 'options', 'Ydw', 'Nac ydw'],
  // View the response repeats the answer the defendant chose on the counterclaim screen
  ['viewTheResponse.json', 'answers.makeCounterClaim', 'Oes', 'Nac oes'],
  // Check your answers repeats the answer the defendant chose on the notice screen
  ['respondToClaim/checkYourAnswersYourResponse.json', 'rows.possessionNoticeReceived.options', 'Do', 'Naddo'],
  ['respondToClaim/legalrep/checkYourAnswersYourResponse.json', 'rows.possessionNoticeReceived.options', 'Do', 'Naddo'],
];

const localesDir = path.join(__dirname, '..', '..', '..', '..', 'main', 'assets', 'locales', 'cy');

function answers(file: string, keyPath: string): { yes?: unknown; no?: unknown } {
  const json = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')) as Record<string, unknown>;
  const node = keyPath
    ? keyPath.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], json)
    : json;
  const record = (node ?? {}) as Record<string, unknown>;
  return keyPath ? { yes: record.yes, no: record.no } : { yes: record.yesOption, no: record.noOption };
}

describe('Welsh Yes/No answers match the Welsh Language Unit YES-NO sheet', () => {
  it.each(WLU_YES_NO)('%s uses %s', (file, keyPath, yes, no) => {
    expect(answers(file, keyPath)).toEqual({ yes, no });
  });
});
