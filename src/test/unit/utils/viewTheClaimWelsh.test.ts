import i18next, { type TFunction } from 'i18next';

import cyViewTheClaim from '../../../main/assets/locales/cy/viewTheClaim.json';
import enViewTheClaim from '../../../main/assets/locales/en/viewTheClaim.json';

import {
  CLAIMANT_TYPE_LABELS,
  HOUSING_ACT_LABELS,
  NOTICE_SERVICE_METHOD_LABELS,
  RENT_FREQUENCY_LABELS,
  STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS,
  TENANCY_TYPE_LABELS,
} from '@utils/viewTheClaim/viewTheClaimLabels';
import { type ViewTheClaimPageData, buildViewTheClaimPageData } from '@utils/viewTheClaim/viewTheClaimUtils';

const caseData = {
  claimGroundSummaries: [
    { value: { code: 'ANTI_SOCIAL', label: 'Antisocial behaviour', reason: 'Loud music every night' } },
    { value: { code: 'BUILDING_WORKS', label: 'Building works (ground A)' } },
  ],
  detailsTab_ClaimantRegistrationAndLicensingDetails: { isExemptLandlord: 'Yes' },
  detailsTab_RentArrearsDetails: { calculationFrequency: 'Monthly', stepsToRecoverArrears: 'No' },
  preActionProtocolCompleted: 'NO',
  detailsTab_NoticeDetails: { noticeServed: 'Yes', noticeMethod: 'By email', noticeUploaded: 'No' },
  detailsTab_OccupationContractLicenceDetails: {
    agreementType: 'Standard contract',
    agreementStartDate: '1 January 2020',
  },
  licenceStartDate: '2020-01-01',
  detailsTab_ClaimantCircumstances: { claimantCircumstancesGiven: 'No' },
  detailsTab_DemotionOfTenancyDetails: {
    housingAct: 'Section 82A(2) of the Housing Act 1985',
    statementOfExpressTermsServed: 'Yes',
  },
  detailsTab_RequiredDocumentsDetails: { hasGasSafetyReport: 'Yes' },
  claimantType: { value: { code: 'PRIVATE_LANDLORD', label: 'Private landlord' } },
  statementOfTruth: { completedBy: 'CLAIMANT' },
};

async function pageFor(
  language: 'en' | 'cy',
  overrides: Record<string, unknown> = {}
): Promise<{ page: ViewTheClaimPageData; t: TFunction }> {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: 'en',
    resources: { en: { viewTheClaim: enViewTheClaim }, cy: { viewTheClaim: cyViewTheClaim } },
  });
  const t = i18n.getFixedT(language);
  const data = { ...caseData, ...overrides };
  return { page: buildViewTheClaimPageData('1234567890123456', data as never, t, language), t };
}

function valueFor(page: ViewTheClaimPageData, label: string): string | undefined {
  const row = page.sections.flatMap(s => s.rows).find(r => r.key.text === label);
  return row?.value.text ?? row?.value.html;
}

describe('View the claim values in Welsh', () => {
  it('shows answers, grounds and labels in Welsh', async () => {
    const { page, t } = await pageFor('cy');
    const value = (key: string, options?: Record<string, unknown>) =>
      valueFor(page, t(`viewTheClaim:labels.${key}`, options));

    expect(page.introText).toContain('Landlord preifat');
    expect(value('isExemptLandlord')).toBe('Ydy');
    expect(value('hasGrounds')).toBe('Oes');
    expect(value('groundsForPossession')).toContain('Ymddygiad gwrthgymdeithasol');
    expect(value('reasonForGround', { ground: 'Ymddygiad gwrthgymdeithasol' })).toBe('Loud music every night');
    expect(value('howIsRentCalculated')).toBe('Pob mis');
    expect(value('previousSteps')).toBe('Naddo');
    expect(value('preActionProtocol')).toBe('Naddo');
    expect(value('noticeServed')).toBe('Do');
    expect(value('noticeServiceMethod')).toBe('Drwy e-bost');
    expect(value('canUploadNotice')).toBe('Nac ydy');
    expect(value('tenancyType')).toBe('Contract safonol');
    expect(value('tenancyStartDate')).toBe('1 Ionawr 2020');
    expect(value('claimantCircumstancesQuestion')).toBe('Nac oes');
    expect(value('demotionQuestion')).toBe('Ydy');
    expect(value('demotionHousingAct')).toBe('Adran 82A(2) Deddf Tai 1985');
    expect(value('demotionStatement')).toBe('Ydy');
    expect(value('gasQuestion')).toBe('Ydy');
    expect(value('statementOfTruthCompletedBy')).toBe('Hawlydd');
  });

  it('shows the grounds, England tenancy types and legal representative added from the ExUI Welsh', async () => {
    const { page, t } = await pageFor('cy', {
      claimGroundSummaries: [
        { value: { code: 'BUILDING_WORKS', label: 'Building works (ground A)' } },
        { value: { code: 'SERIOUS_RENT_ARREARS_GROUND8', label: 'Serious rent arrears (ground 8)' } },
        { value: { code: 'NO_GROUNDS', label: 'No grounds' } },
      ],
      detailsTab_TenancyLicenceDetails: { typeOfTenancyLicence: 'Assured tenancy' },
      detailsTab_OccupationContractLicenceDetails: undefined,
      statementOfTruth: { completedBy: 'LEGAL_REPRESENTATIVE' },
    });
    const value = (key: string) => valueFor(page, t(`viewTheClaim:labels.${key}`));

    expect(value('groundsForPossession')).toContain('Gwaith adeiladu (sail A)');
    expect(value('groundsForPossession')).toContain('Ôl-ddyledion rhent difrifol (sail 8)');
    expect(value('groundsForPossession')).toContain('Dim seiliau');
    expect(value('tenancyType')).toBe('Tenantiaeth sicr');
    expect(value('statementOfTruthCompletedBy')).toBe(
      'Cynrychiolydd cyfreithiol yr hawlydd (fel y’i diffinnir gan CPR 2.3(1))'
    );
  });

  it('keeps a value with no Welsh translation yet in English', async () => {
    const { page } = await pageFor('cy', {
      claimantType: { value: { code: 'COMMUNITY_LANDLORD', label: 'Community landlord' } },
    });

    expect(page.introText).toContain('Community landlord');
  });

  it('leaves every English value exactly as pcs-api sent it', async () => {
    const { page, t } = await pageFor('en');
    const value = (key: string) => valueFor(page, t(`viewTheClaim:labels.${key}`));

    expect(page.introText).toContain('Private landlord');
    expect(value('isExemptLandlord')).toBe('Yes');
    expect(value('hasGrounds')).toBe('Yes');
    expect(value('groundsForPossession')).toContain('Antisocial behaviour');
    expect(value('howIsRentCalculated')).toBe('Monthly');
    expect(value('noticeServiceMethod')).toBe('By email');
    expect(value('tenancyType')).toBe('Standard contract');
    expect(value('tenancyStartDate')).toBe('1 January 2020');
    expect(value('demotionHousingAct')).toBe('Section 82A(2) of the Housing Act 1985');
    expect(value('statementOfTruthCompletedBy')).toBe('Claimant');
  });
});

describe('Welsh value keys match the English labels pcs-api sends', () => {
  const values = cyViewTheClaim.values as Record<string, Record<string, unknown>>;
  const englishValues = enViewTheClaim.values as Record<string, Record<string, unknown>>;

  it.each([
    ['noticeMethods', NOTICE_SERVICE_METHOD_LABELS],
    ['tenancyTypes', TENANCY_TYPE_LABELS],
    ['rentFrequencies', RENT_FREQUENCY_LABELS],
    ['housingActSections', HOUSING_ACT_LABELS],
    ['claimantTypes', CLAIMANT_TYPE_LABELS],
    ['statementOfTruthCompletedBy', STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS],
  ])('every %s code with Welsh has a matching English label', (group, labels) => {
    for (const code of Object.keys(values[group])) {
      expect(englishValues[group][code]).toBe(labels[code]);
    }
  });
});
