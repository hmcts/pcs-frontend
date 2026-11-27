import fs from 'fs';
import path from 'path';

const LOCALES = path.resolve(__dirname, '../../../../main/assets/locales');

const read = (lang: string, file: string) => JSON.parse(fs.readFileSync(path.join(LOCALES, lang, file), 'utf8'));

// View-the-response answer -> the citizen question page it summarises.
const QUESTION_PAGE: Record<string, string> = {
  possessionNoticeReceived: 'confirmationOfNoticeGiven',
  makeCounterClaim: 'counterClaim',
  anyPaymentsMade: 'repaymentsMade',
  repaymentPlanAgreed: 'repaymentsAgreed',
  repayArrearsInstalments: 'instalmentPayments',
  dependantChildren: 'doYouHaveAnyDependantChildren',
  otherDependants: 'doYouHaveAnyOtherDependants',
  otherTenants: 'doAnyOtherAdultsLiveInYourHome',
  alternativeAccommodation: 'wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome',
  shareAdditionalCircumstances: 'yourCircumstances',
  exceptionalHardship: 'exceptionalHardship',
  universalCreditApplied: 'haveYouAppliedForUniversalCredit',
  priorityDebts: 'priorityDebts',
  otherConsiderations: 'otherConsiderations',
  isClaimAmountKnown: 'counterClaimSpecificSum',
  appliedForHwf: 'counterClaimHaveYouAppliedForHelp',
};

describe.each(['en', 'cy'])('view-the-response yes/no (%s)', lang => {
  const answers = read(lang, 'viewTheResponse.json').answers;

  it('covers exactly the mapped answers', () => {
    expect(Object.keys(answers).sort()).toEqual(Object.keys(QUESTION_PAGE).sort());
  });

  it.each(Object.entries(QUESTION_PAGE))('%s matches the %s question page', (answer, page) => {
    const { yes, no } = read(lang, `respondToClaim/${page}.json`).options;
    expect(answers[answer]).toEqual({ yes, no });
  });
});
