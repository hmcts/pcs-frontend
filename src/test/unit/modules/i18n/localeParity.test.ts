import fs from 'fs';
import path from 'path';

const LOCALES = path.resolve(__dirname, '../../../../main/assets/locales');
const EN = path.join(LOCALES, 'en');
const CY = path.join(LOCALES, 'cy');

/**
 * Keys with no Welsh supplied yet (HDPI-9039 "Scope 2").
 *
 * Thirteen have no translation anywhere in the service and are waiting on the
 * language team; four have two competing renderings in the repo and need a
 * house-style ruling rather than a guess:
 *   "Check your answers"  -> Gwirio eich atebion / Gwiriwch eich atebion
 *   "Regular expenses"    -> Costau rheolaidd / Treuliau
 *   "What's your postal address?" -> no exact existing match
 *
 * This list must only ever shrink. Adding to it needs a Jira reference.
 */
const UNTRANSLATED_ALLOWLIST = new Set([
  'common.json::taskList.yourSupport',
  'respondToClaim/checkYourAnswersDocuments.json::rows.uploadedDocuments.changeHidden',
  'respondToClaim/checkYourAnswersPersonalDetails.json::rows.correspondenceAddressConfirmation.fallbackLabel',
  'respondToClaim/endOfJourneyCya.json::pageTitle',
  'respondToClaim/endOfJourneyCya.json::heading',
  'respondToClaim/endOfJourneyCya.json::sections.regularExpenses',
  'respondToClaim/endOfJourneyCya.json::rows.uploadedDocuments.changeHidden',
  'respondToClaim/legalrep/checkYourAnswersDocuments.json::rows.uploadedDocuments.changeHidden',
  'respondToClaim/legalrep/checkYourAnswersPersonalDetails.json::rows.emailAddress.changeHidden',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::options.pba',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::labels.selectPba',
  'respondToClaim/legalrep/endOfJourneyCya.json::rows.uploadedDocuments.changeHidden',
  'respondToClaim/legalrep/tenancyTypeDetails.json::tenancyTypeOther',
  'viewTheClaim.json::sections.tenancyDetails',
  'viewTheClaim.json::labels.trespassClaim',
  'viewTheClaim.json::labels.previousSteps',
  'viewTheResponse.json::defendant.address',
]);

/**
 * Files whose en and cy key sets already diverged before HDPI-9039 (13 keys
 * present only in en, so they fall back to English; 65 orphaned only in cy).
 * Untouched here to keep this change translation-only. Must only ever shrink.
 */
const KEY_DRIFT_ALLOWLIST = new Set([
  'eligibility.json',
  'respondToClaim/correspondenceAddress.json',
  'respondToClaim/legalrep/defendantDateOfBirth.json',
  'respondToClaim/legalrep/defendantNameConfirmation.json',
  'respondToClaim/legalrep/endOfJourneyCya.json',
  'respondToClaim/legalrep/exceptionalHardship.json',
  'respondToClaim/legalrep/haveYouAppliedForUniversalCredit.json',
  'respondToClaim/legalrep/installmentPayments.json',
  'respondToClaim/legalrep/nonRentArrearsDispute.json',
  'respondToClaim/legalrep/priorityDebts.json',
  'respondToClaim/legalrep/repaymentsAgreed.json',
  'respondToClaim/legalrep/tenancyDateDetails.json',
  'respondToClaim/legalrep/tenancyDateUnknown.json',
  'respondToClaim/legalrep/tenancyTypeDetails.json',
  'respondToClaim/legalrep/whatRegularIncomeDoYouReceive.json',
  'respondToClaim/legalrep/writtenTerms.json',
  'respondToClaim/repaymentsAgreed.json',
  'uploadAdditionalDocuments/checkYourAnswers.json',
]);

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const jsonFiles = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(e =>
      e.isDirectory() ? jsonFiles(path.join(dir, e.name)) : e.name.endsWith('.json') ? [path.join(dir, e.name)] : []
    );

const flatten = (value: Json, prefix = ''): Record<string, Json> => {
  if (Array.isArray(value)) {
    return Object.assign({}, ...value.map((v, i) => flatten(v, `${prefix}[${i}]`)));
  }
  if (value !== null && typeof value === 'object') {
    return Object.assign({}, ...Object.entries(value).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)));
  }
  return { [prefix]: value };
};

const read = (file: string) => flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
const tokens = (s: string) => (s.match(/\{\{.*?\}\}/g) ?? []).map(t => t.replace(/\s+/g, '')).sort();

const files = jsonFiles(EN).map(f => path.relative(EN, f));

describe('en/cy locale parity', () => {
  it('has a cy file for every en file', () => {
    expect(files.filter(f => !fs.existsSync(path.join(CY, f)))).toEqual([]);
  });

  describe.each(files)('%s', file => {
    const en = read(path.join(EN, file));
    const cy = fs.existsSync(path.join(CY, file)) ? read(path.join(CY, file)) : {};
    const pairs = Object.entries(en).filter(
      ([key, value]) => typeof value === 'string' && typeof cy[key] === 'string'
    ) as [string, string][];

    it('has the same keys in cy as in en', () => {
      const drifted = KEY_DRIFT_ALLOWLIST.has(file);
      const missingFromCy = drifted ? [] : Object.keys(en).filter(k => !(k in cy));
      const orphanedInCy = drifted ? [] : Object.keys(cy).filter(k => !(k in en));
      expect({ missingFromCy, orphanedInCy }).toEqual({ missingFromCy: [], orphanedInCy: [] });
    });

    it('has no untranslated "cy<English>" placeholders', () => {
      const untranslated = pairs
        .filter(([key, value]) => {
          const actual = (cy[key] as string).trim();
          const expected = value.trim();
          return actual === `cy${expected}` || actual === `cy ${expected}`;
        })
        .map(([key]) => `${file}::${key}`)
        .filter(id => !UNTRANSLATED_ALLOWLIST.has(id));
      expect(untranslated).toEqual([]);
    });

    it('keeps every {{interpolation}} token from en in cy', () => {
      const drifted = pairs
        .filter(([key, value]) => JSON.stringify(tokens(value)) !== JSON.stringify(tokens(cy[key] as string)))
        .map(([key]) => `${file}::${key}`);
      expect(drifted).toEqual([]);
    });
  });
});
