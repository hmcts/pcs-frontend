import fs from 'fs';
import path from 'path';

const LOCALES = path.resolve(__dirname, '../../../../main/assets/locales');
const EN = path.join(LOCALES, 'en');
const CY = path.join(LOCALES, 'cy');

/**
 * Keys still rendering English (HDPI-9039 "Scope 2"). Three shapes:
 *
 *  - no Welsh supplied anywhere in the service, awaiting the language team;
 *  - two competing renderings already live, needing a house-style ruling
 *    ("Check your answers", "Regular expenses");
 *  - a placeholder whose English has since drifted, so the original
 *    "cy<English>" no longer matches the current source string - these were
 *    invisible to the first version of this check.
 *
 * This list must only ever shrink. Adding to it needs a Jira reference.
 */
const UNTRANSLATED_ALLOWLIST = new Set([
  'common.json::taskList.yourSupport',
  'respondToClaim/checkYourAnswersPersonalDetails.json::rows.correspondenceAddressConfirmation.fallbackLabel',
  'respondToClaim/endOfJourneyCya.json::heading',
  'respondToClaim/endOfJourneyCya.json::pageTitle',
  'respondToClaim/endOfJourneyCya.json::sections.regularExpenses',
  'respondToClaim/legalrep/checkYourAnswersPersonalDetails.json::rows.emailAddress.changeHidden',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::labels.pba',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::labels.selectPba',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::options.pba',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::pageTitle',
  'respondToClaim/legalrep/counterClaimApplicationFeeAmount.json::payNowButton',
  'respondToClaim/legalrep/counterClaimHaveYouAppliedForHelp.json::revealedHwfQuestionHint',
  'respondToClaim/legalrep/counterClaimSpecificSum.json::noSpecificFeeText',
  'respondToClaim/legalrep/counterClaimSpecificSum.json::specificFeeText',
  'respondToClaim/legalrep/responseSubmittedCounterClaimFeePaymentNeeded.json::responseSubmittedCounterClaimFeePaymentNeededListItem1',
  'respondToClaim/legalrep/tenancyDateDetails.json::dateLabel',
  'respondToClaim/legalrep/tenancyDateDetails.json::errors.confirmTenancyDate',
  'respondToClaim/legalrep/tenancyDateDetails.json::heading',
  'respondToClaim/legalrep/tenancyDateDetails.json::hintText',
  'respondToClaim/legalrep/tenancyDateDetails.json::question',
  'respondToClaim/legalrep/tenancyTypeDetails.json::tenancyTypeOther',
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
/**
 * An untranslated marker: the literal "cy" stuck on the front of English text,
 * either directly before a capital or a tag, or left as a bare word. Matched
 * anywhere in the value so a marker inside HTML is caught too. No Welsh word is
 * a bare "cy", and none has "cy" immediately before a capital, so this does not
 * fire on real translations such as "cyflwynwyd".
 */
const PLACEHOLDER = /\bcy(?=[A-Z<])|\bcy\s+(?=[A-Za-z<])/;

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

    it('has no untranslated "cy" markers', () => {
      const untranslated = pairs
        .filter(([, value]) => value.trim() !== '')
        .filter(([key]) => PLACEHOLDER.test(cy[key] as string))
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
