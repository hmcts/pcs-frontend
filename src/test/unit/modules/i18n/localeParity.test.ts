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
  'respondToClaim/checkYourAnswersPersonalDetails.json::rows.correspondenceAddressConfirmation.fallbackLabel',
  'respondToClaim/endOfJourneyCya.json::heading',
  'respondToClaim/endOfJourneyCya.json::pageTitle',
  'respondToClaim/endOfJourneyCya.json::sections.regularExpenses',
  'respondToClaim/legalrep/counterClaimHaveYouAppliedForHelp.json::revealedHwfQuestionHint',
  'respondToClaim/legalrep/counterClaimSpecificSum.json::noSpecificFeeText',
  'respondToClaim/legalrep/counterClaimSpecificSum.json::specificFeeText',
  'respondToClaim/legalrep/tenancyDateDetails.json::dateLabel',
  'respondToClaim/legalrep/tenancyDateDetails.json::errors.confirmTenancyDate',
  'respondToClaim/legalrep/tenancyDateDetails.json::heading',
  'respondToClaim/legalrep/tenancyDateDetails.json::hintText',
  'respondToClaim/legalrep/tenancyDateDetails.json::question',
  'respondToClaim/legalrep/tenancyTypeDetails.json::tenancyTypeOther',

  // HDPI-8858 - waiting on translations for these pages
  'footer/cookies.json::pageTitle',
  'footer/cookies.json::cookies.title',
  'footer/cookies.json::cookies.description1',
  'footer/cookies.json::cookies.description2',
  'footer/cookies.json::cookies.description3',
  'footer/cookies.json::howCookiesAreUsedInThisService.title',
  'footer/cookies.json::howCookiesAreUsedInThisService.description1',
  'footer/cookies.json::cookieTable.header.name',
  'footer/cookies.json::cookieTable.header.purpose',
  'footer/cookies.json::cookieTable.header.expires',
  'footer/cookies.json::cookieTable.row1.purpose',
  'footer/cookies.json::cookieTable.row2.purpose',
  'footer/cookies.json::cookieTable.row2.expires',
  'footer/cookies.json::cookieTable.row3.purpose',
  'footer/cookies.json::cookieTable.row3.expires',
  'footer/cookies.json::cookieTable.row4.purpose',
  'footer/cookies.json::cookieTable.row4.expires',
  'footer/cookies.json::cookieTable.row5.purpose',
  'footer/cookies.json::cookieTable.row5.expires',
  'footer/cookies.json::cookieTable.row6.purpose',
  'footer/cookies.json::cookieTable.row6.expires',
  'footer/cookies.json::cookieTable.row7.purpose',
  'footer/cookies.json::cookieTable.row7.expires',
  'footer/cookies.json::cookieTable.row8.purpose',
  'footer/cookies.json::cookieTable.row8.expires',
  'footer/get-help.json::pageTitle',
  'footer/get-help.json::myHMCTSContactDetails.title',
  'footer/get-help.json::myHMCTSContactDetails.description1',
  'footer/get-help.json::possessionsClaimContactDetails.title',
  'footer/get-help.json::possessionsClaimContactDetails.description1',
  'footer/get-help.json::nationalContactCentreForCivilFamilyCourtContactDetails.title',
  'footer/get-help.json::nationalContactCentreForCivilFamilyCourtContactDetails.description1',
  'footer/get-help.json::getHelp.title',
  'footer/get-help.json::getHelp.description1',
  'footer/privacy-policy.json::pageTitle',
  'footer/privacy-policy.json::privacyPolicy.title',
  'footer/privacy-policy.json::privacyPolicy.list.item1',
  'footer/privacy-policy.json::privacyPolicy.list.item2',
  'footer/privacy-policy.json::privacyPolicy.list.item3',
  'footer/privacy-policy.json::privacyPolicy.list.item4',
  'footer/privacy-policy.json::privacyPolicy.list.item5',
  'footer/privacy-policy.json::privacyPolicy.list.item6',
  'footer/privacy-policy.json::privacyPolicy.list.item7',
  'footer/privacy-policy.json::privacyPolicy.list.item8',
  'footer/privacy-policy.json::overview.overview.title',
  'footer/privacy-policy.json::overview.overview.description1',
  'footer/privacy-policy.json::overview.whoManagesThisService.title',
  'footer/privacy-policy.json::overview.whoManagesThisService.description1',
  'footer/privacy-policy.json::overview.whoManagesThisService.description2',
  'footer/privacy-policy.json::overview.whoManagesThisService.description3',
  'footer/privacy-policy.json::overview.whyWeCollectYourPersonalData.title',
  'footer/privacy-policy.json::overview.whyWeCollectYourPersonalData.description1',
  'footer/privacy-policy.json::overview.whyWeCollectYourPersonalData.description2',
  'footer/privacy-policy.json::overview.typesOfPersonalDataWeCollect.title',
  'footer/privacy-policy.json::overview.typesOfPersonalDataWeCollect.description1',
  'footer/privacy-policy.json::overview.typesOfPersonalDataWeCollect.description2',
  'footer/privacy-policy.json::overview.usingYourData.title',
  'footer/privacy-policy.json::overview.usingYourData.description1',
  'footer/privacy-policy.json::overview.usingYourData.description2',
  'footer/privacy-policy.json::overview.usingYourData.description3',
  'footer/privacy-policy.json::overview.usingYourData.list.item1',
  'footer/privacy-policy.json::overview.usingYourData.list.item2',
  'footer/privacy-policy.json::overview.usingYourData.list.item3',
  'footer/privacy-policy.json::overview.usingYourData.list.item4',
  'footer/privacy-policy.json::overview.usingYourData.list.item5',
  'footer/privacy-policy.json::overview.usingYourData.list.item6',
  'footer/privacy-policy.json::overview.usingYourData.list.item7',
  'footer/privacy-policy.json::overview.usingYourData.list.item8',
  'footer/privacy-policy.json::overview.usingYourData.list.item9',
  'footer/privacy-policy.json::overview.usingYourData.list.item10',
  'footer/privacy-policy.json::overview.storingYourData.title',
  'footer/privacy-policy.json::overview.storingYourData.description1',
  'footer/privacy-policy.json::overview.storingYourData.description2',
  'footer/privacy-policy.json::overview.storingYourData.description3',
  'footer/privacy-policy.json::overview.sharingYourData.title',
  'footer/privacy-policy.json::overview.sharingYourData.description1',
  'footer/privacy-policy.json::overview.sharingYourData.description2',
  'footer/privacy-policy.json::overview.sharingYourData.description3',
  'footer/privacy-policy.json::overview.sharingYourData.description4',
  'footer/privacy-policy.json::overview.storingAndSharingYourDataInternationally.title',
  'footer/privacy-policy.json::overview.storingAndSharingYourDataInternationally.description1',
  'footer/privacy-policy.json::overview.yourRights.title',
  'footer/privacy-policy.json::overview.yourRights.description1',
  'footer/privacy-policy.json::overview.yourRights.description2',
  'footer/privacy-policy.json::overview.yourRights.description3',
  'footer/privacy-policy.json::overview.yourRights.description4',
  'footer/privacy-policy.json::overview.howToComplain.title',
  'footer/privacy-policy.json::overview.howToComplain.description1',
  'footer/privacy-policy.json::overview.howToComplain.description2',
  'footer/privacy-policy.json::overview.howToComplain.description3',
  'footer/privacy-policy.json::overview.howToComplain.description4',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.title',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.description1',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.list.item1',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.list.item2',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.list.item3',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.list.item4',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.list.item5',
  'footer/privacy-policy.json::overview.theServiceYouAreUsing.list.item6',
  'footer/privacy-policy.json::appealABenefitDecisionService.usingTheAppealABenefitDecisionService.title',
  'footer/privacy-policy.json::appealABenefitDecisionService.thePersonalDataWeNeed3.title',
  'footer/privacy-policy.json::appealABenefitDecisionService.thePersonalDataWeNeed3.description1',
  'footer/privacy-policy.json::appealABenefitDecisionService.thePersonalDataWeNeed3.description2',
  'footer/privacy-policy.json::appealABenefitDecisionService.thePersonalDataWeNeed3.description3',
  'footer/privacy-policy.json::appealABenefitDecisionService.receivingNotifications2.title',
  'footer/privacy-policy.json::appealABenefitDecisionService.receivingNotifications2.description1',
  'footer/privacy-policy.json::appealABenefitDecisionService.receivingNotifications2.description2',
  'footer/privacy-policy.json::appealABenefitDecisionService.receivingNotifications2.description3',
  'footer/privacy-policy.json::appealABenefitDecisionService.storingAndSharingYourData.title',
  'footer/privacy-policy.json::appealABenefitDecisionService.storingAndSharingYourData.description1',
  'footer/privacy-policy.json::appealABenefitDecisionService.storingAndSharingYourData.description2',
  'footer/privacy-policy.json::applyForDivorceService.usingTheApplyForADivorceService.title',
  'footer/privacy-policy.json::applyForDivorceService.thePersonalDataWeNeed.title',
  'footer/privacy-policy.json::applyForDivorceService.thePersonalDataWeNeed.description1',
  'footer/privacy-policy.json::applyForDivorceService.receivingNotifications.title',
  'footer/privacy-policy.json::applyForDivorceService.receivingNotifications.description1',
  'footer/privacy-policy.json::applyForDivorceService.storingYourData2.title',
  'footer/privacy-policy.json::applyForDivorceService.storingYourData2.description1',
  'footer/privacy-policy.json::applyForDivorceService.storingYourData2.description2',
  'footer/privacy-policy.json::applyForDivorceService.storingYourData2.description3',
  'footer/privacy-policy.json::applyForDivorceService.storingYourData2.description4',
  'footer/privacy-policy.json::applyForDivorceService.sharingYourData2.title',
  'footer/privacy-policy.json::applyForDivorceService.sharingYourData2.description1',
  'footer/privacy-policy.json::applyForDivorceService.sharingYourData2.description2',
  'footer/privacy-policy.json::applyForDivorceService.sharingYourData2.description3',
  'footer/privacy-policy.json::applyForDivorceService.sharingYourData2.description4',
  'footer/privacy-policy.json::applyForDivorceService.sharingYourData2.description5',
  'footer/privacy-policy.json::applyForProbateService.usingTheApplyForProbateService.title',
  'footer/privacy-policy.json::applyForProbateService.thePersonalDataWeCollect.title',
  'footer/privacy-policy.json::applyForProbateService.thePersonalDataWeCollect.description1',
  'footer/privacy-policy.json::applyForProbateService.storingYourData4.title',
  'footer/privacy-policy.json::applyForProbateService.storingYourData4.description1',
  'footer/privacy-policy.json::applyForProbateService.storingYourData4.description2',
  'footer/privacy-policy.json::applyForProbateService.storingYourData4.description3',
  'footer/privacy-policy.json::applyForProbateService.storingYourData5.title',
  'footer/privacy-policy.json::applyForProbateService.storingYourData5.description1',
  'footer/privacy-policy.json::applyForProbateService.beforeYouSubmitYourInformation2.title',
  'footer/privacy-policy.json::applyForProbateService.beforeYouSubmitYourInformation2.description1',
  'footer/privacy-policy.json::applyForProbateService.afterYouSubmitYourInformation2.title',
  'footer/privacy-policy.json::applyForProbateService.afterYouSubmitYourInformation2.description1',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.title',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.description1',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.description2',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.description3',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.description4',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.description5',
  'footer/privacy-policy.json::applyForProbateService.sharingYourData4.description6',
  'footer/privacy-policy.json::moneyClaimsService.usingTheMoneyClaimsService.title',
  'footer/privacy-policy.json::moneyClaimsService.thePersonalDataWeNeed2.title',
  'footer/privacy-policy.json::moneyClaimsService.thePersonalDataWeNeed2.description1',
  'footer/privacy-policy.json::moneyClaimsService.thePersonalDataWeNeed2.description2',
  'footer/privacy-policy.json::moneyClaimsService.thePersonalDataWeNeed2.description3',
  'footer/privacy-policy.json::moneyClaimsService.storingYourData3.title',
  'footer/privacy-policy.json::moneyClaimsService.storingYourData3.description1',
  'footer/privacy-policy.json::moneyClaimsService.beforeYouSubmitYourInformation.title',
  'footer/privacy-policy.json::moneyClaimsService.beforeYouSubmitYourInformation.description1',
  'footer/privacy-policy.json::moneyClaimsService.afterYouSubmitYourInformation.title',
  'footer/privacy-policy.json::moneyClaimsService.afterYouSubmitYourInformation.description1',
  'footer/privacy-policy.json::moneyClaimsService.afterYouSubmitYourInformation.description2',
  'footer/privacy-policy.json::moneyClaimsService.sharingYourData3.title',
  'footer/privacy-policy.json::moneyClaimsService.sharingYourData3.description1',
  'footer/privacy-policy.json::moneyClaimsService.sharingYourData3.description2',
  'footer/privacy-policy.json::moneyClaimsService.sharingYourData3.description3',
  'footer/privacy-policy.json::familyPublicLawService.usingTheFamilyPublicLawService.title',
  'footer/privacy-policy.json::familyPublicLawService.whatIsThePersonalDataThatWe.title',
  'footer/privacy-policy.json::familyPublicLawService.whatIsThePersonalDataThatWe.description1',
  'footer/privacy-policy.json::familyPublicLawService.whatIsThePersonalDataThatWe.description2',
  'footer/privacy-policy.json::familyPublicLawService.whatWeDoWithYourData.title',
  'footer/privacy-policy.json::familyPublicLawService.whatWeDoWithYourData.description1',
  'footer/privacy-policy.json::familyPublicLawService.whatWeDoWithYourData.description2',
  'footer/privacy-policy.json::familyPublicLawService.whatWeDoWithYourData.description3',
  'footer/privacy-policy.json::familyPublicLawService.whatWeDoWithYourData.description4',
  'footer/privacy-policy.json::familyPublicLawService.yourRights2.title',
  'footer/privacy-policy.json::familyPublicLawService.yourRights2.description1',
  'footer/privacy-policy.json::familyPublicLawService.yourRights2.description2',
  'footer/privacy-policy.json::familyPublicLawService.sharingYourData5.title',
  'footer/privacy-policy.json::familyPublicLawService.sharingYourData5.description1',
  'footer/privacy-policy.json::familyPublicLawService.receivingNotifications3.title',
  'footer/privacy-policy.json::familyPublicLawService.receivingNotifications3.description1',
  'footer/privacy-policy.json::familyPublicLawService.receivingNotifications3.description2',
  'footer/privacy-policy.json::familyPublicLawService.howToComplain2.title',
  'footer/privacy-policy.json::familyPublicLawService.howToComplain2.description1',
  'footer/privacy-policy.json::familyPublicLawService.howToComplain2.description2',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.usingTheAppealAnImmigrationOrAsylum.title',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.thePersonalDataWeNeed4.title',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.thePersonalDataWeNeed4.description1',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.storingAndSharingYourData2.title',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.storingAndSharingYourData2.description1',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.afterYouSubmitYourInformation3.title',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.afterYouSubmitYourInformation3.description1',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.afterYouSubmitYourInformation3.description2',
  'footer/privacy-policy.json::appealAnImmigrationOrAsylumDecisionService.afterYouSubmitYourInformation3.description3',
  'footer/privacy-policy.json::possessionClaimsService.usingThePossessionClaimsService.title',
  'footer/privacy-policy.json::possessionClaimsService.thePersonalDataWeNeed5.title',
  'footer/privacy-policy.json::possessionClaimsService.thePersonalDataWeNeed5.description1',
  'footer/privacy-policy.json::possessionClaimsService.thePersonalDataWeNeed5.description2',
  'footer/privacy-policy.json::possessionClaimsService.thePersonalDataWeNeed5.description3',
  'footer/privacy-policy.json::possessionClaimsService.storingYourData6.title',
  'footer/privacy-policy.json::possessionClaimsService.storingYourData6.description1',
  'footer/privacy-policy.json::possessionClaimsService.beforeYouSubmitYourInformation3.title',
  'footer/privacy-policy.json::possessionClaimsService.beforeYouSubmitYourInformation3.description1',
  'footer/privacy-policy.json::possessionClaimsService.afterYouSubmitYourInformation4.title',
  'footer/privacy-policy.json::possessionClaimsService.afterYouSubmitYourInformation4.description1',
  'footer/privacy-policy.json::possessionClaimsService.afterYouSubmitYourInformation4.description2',
  'footer/privacy-policy.json::possessionClaimsService.sharingYourData6.title',
  'footer/privacy-policy.json::possessionClaimsService.sharingYourData6.description1',
  'footer/privacy-policy.json::possessionClaimsService.sharingYourData6.description2',
  'footer/terms-and-conditions.json::pageTitle',
  'footer/terms-and-conditions.json::termsAndConditions.title',
  'footer/terms-and-conditions.json::termsAndConditions.description1',
  'footer/terms-and-conditions.json::termsAndConditions.description2',
  'footer/terms-and-conditions.json::termsAndConditions.description3',
  'footer/terms-and-conditions.json::termsAndConditions.description4',
  'footer/terms-and-conditions.json::whoWeAre.title',
  'footer/terms-and-conditions.json::whoWeAre.description1',
  'footer/terms-and-conditions.json::whoWeAre.description2',
  'footer/terms-and-conditions.json::termsOfService.title',
  'footer/terms-and-conditions.json::termsOfService.description1',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.title',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description1',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description2',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description3',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description4',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description5',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description6',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description7',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description8',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description9',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description10',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description11',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description12',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description13',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description14',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description15',
  'footer/terms-and-conditions.json::howToUseThisServiceResponsibly.description16',
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
  'respondToClaim/legalrep/instalmentPayments.json',
  'respondToClaim/legalrep/nonRentArrearsDispute.json',
  'respondToClaim/legalrep/priorityDebts.json',
  'respondToClaim/legalrep/repaymentsAgreed.json',
  'respondToClaim/legalrep/tenancyDateDetails.json',
  'respondToClaim/legalrep/whatRegularIncomeDoYouReceive.json',
  'respondToClaim/legalrep/writtenTerms.json',
  'respondToClaim/repaymentsAgreed.json',
  'uploadAdditionalDocuments/checkYourAnswers.json',
]);

/**
 * Files written ahead of their Welsh, holding a "cy" marker on every value. Their pages stay in English until the
 * translation replaces them all. Must only ever shrink.
 */
const AWAITING_TRANSLATION = new Set<string>([]);

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
      const awaiting = AWAITING_TRANSLATION.has(file);
      const untranslated = (awaiting ? [] : pairs)
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
