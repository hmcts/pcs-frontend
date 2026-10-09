import i18next, { type TFunction } from 'i18next';

import cyViewTheClaim from '../../../main/assets/locales/cy/viewTheClaim.json';
import enViewTheClaim from '../../../main/assets/locales/en/viewTheClaim.json';

import {
  CLAIMANT_TYPE_LABELS,
  GROUND_LABELS,
  HOUSING_ACT_LABELS,
  NOTICE_SERVICE_METHOD_LABELS,
  RENT_FREQUENCY_LABELS,
  STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS,
  TENANCY_TYPE_LABELS,
} from '@utils/viewTheClaim/viewTheClaimLabels';
import {
  type ViewTheClaimCopy,
  type ViewTheClaimPageData,
  buildViewTheClaimPageData,
  localisedValue,
} from '@utils/viewTheClaim/viewTheClaimUtils';

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

  it('shows the Wales grounds in their Renting Homes (Wales) Act 2016 Welsh', async () => {
    const { page, t } = await pageFor('cy', {
      claimGroundSummaries: [
        {
          value: {
            code: 'HOUSING_ASSOCIATIONS_AND_TRUSTS',
            label: 'Housing associations and housing trusts: people difficult to house (ground E)',
          },
        },
        {
          value: {
            code: 'SERIOUS_ARREARS_PERIODIC_S181',
            label: 'Contract-holder under a periodic standard contract seriously in arrears with rent (section 181)',
          },
        },
      ],
    });
    const grounds = valueFor(page, t('viewTheClaim:labels.groundsForPossession'));

    expect(grounds).toContain('Cymdeithasau tai ac ymddiriedolaethau tai: pobl anodd i’w cartrefu (sail E)');
    expect(grounds).toContain(
      'Deilydd contract o dan gontract cyfnodol safonol gydag ôl-ddyledion rhent difrifol (adran 181)'
    );
  });

  // Wording supplied by the Welsh Language Unit (PCS ExUI Welsh upload) – keep it as supplied.
  it.each([
    [
      'labels.assuredNoArrearsReasonsNuisanceOrIllegalUse',
      'Niwsans, dicter, defnydd anghyfreithlon neu anfoesol o’r eiddo (sail 14)',
    ],
    [
      'labels.walesFailToGiveUpS170Reason',
      'Methu ildio meddiant ar ddyddiad a nodwyd yn hysbysiad y deilydd contract (adran 170)',
    ],
    [
      'labels.walesFailToGiveUpBreakNoticeS191Reason',
      'Methu rhoi’r gorau i feddiannu ar y dyddiad a nodwyd yn hysbysiad cymal terfynu deilydd y contract (adran 191)',
    ],
    [
      'labels.walesLandlordNoticeFtEndS186Reason',
      'Hysbysiad landlord mewn cysylltiad â diwedd tymor penodol wedi’i roi (adran 186)',
    ],
    [
      'labels.walesSecureFailureToGiveUpPossessionSection170Reason',
      'Methu ildio meddiant ar ddyddiad a nodwyd yn hysbysiad y deilydd contract (adran 170)',
    ],
    [
      'labels.walesSecureFailureToGiveUpPossessionSection191Reason',
      'Methu rhoi’r gorau i feddiannu ar y dyddiad a nodwyd yn hysbysiad cymal terfynu deilydd y contract (adran 191)',
    ],
    [
      'labels.walesSecureLandlordNoticeSection186Reason',
      'Hysbysiad landlord mewn cysylltiad â diwedd tymor penodol wedi’i roi (adran 186)',
    ],
    [
      'values.groundNames.FAILURE_TO_GIVE_UP_POSSESSION_S170',
      'Methu ildio meddiant ar ddyddiad a nodwyd yn hysbysiad y deilydd contract (adran 170)',
    ],
    [
      'values.groundNames.FAILURE_TO_GIVE_UP_POSSESSION_S191',
      'Methu rhoi’r gorau i feddiannu ar y dyddiad a nodwyd yn hysbysiad cymal terfynu deilydd y contract (adran 191)',
    ],
    [
      'values.groundNames.FAIL_TO_GIVE_UP_BREAK_NOTICE_S191',
      'Methu rhoi’r gorau i feddiannu ar y dyddiad a nodwyd yn hysbysiad cymal terfynu deilydd y contract (adran 191)',
    ],
    [
      'values.groundNames.LANDLORD_NOTICE_FT_END_S186',
      'Hysbysiad landlord mewn cysylltiad â diwedd tymor penodol wedi’i roi (adran 186)',
    ],
    [
      'values.groundNames.LANDLORD_NOTICE_S186',
      'Hysbysiad landlord mewn cysylltiad â diwedd tymor penodol wedi’i roi (adran 186)',
    ],
    [
      'values.groundNames.NUISANCE_ANNOYANCE_GROUND14',
      'Niwsans, dicter, defnydd anghyfreithlon neu anfoesol o’r eiddo (sail 14)',
    ],
    [
      'values.groundNames.NUISANCE_OR_IMMORAL_USE',
      'Niwsans, dicter, defnydd anghyfreithlon neu anfoesol o’r eiddo (sail 2)',
    ],
    ['values.groundNames.TENANCY_OBTAINED_BY_FALSE_STATEMENT', 'Tenantiaeth drwy ddatganiad anwir (sail 5)'],
    ['values.groundNames.ANTISOCIAL_BEHAVIOUR_S157', 'Ymddygiad gwrthgymdeithasol (torri contract) (adran 157)'],
    [
      'values.groundNames.HOUSING_ASSOCIATIONS_AND_TRUSTS',
      'Cymdeithasau tai ac ymddiriedolaethau tai: pobl anodd i’w cartrefu (sail E)',
    ],
    ['values.groundNames.RIOT_OFFENCE', 'Trosedd yn ystod cythrwfl (sail 2ZA)'],
    ['values.groundNames.OFFENCE_RIOT_GROUND14ZA', 'Trosedd yn ystod cythrwfl (sail 14ZA)'],
    ['labels.assuredNoArrearsReasonsOffenceDuringRiot', 'Trosedd yn ystod cythrwfl (sail 14ZA)'],
    [
      'values.noticeMethods.FIRST_CLASS_POST',
      'Drwy bost dosbarth cyntaf neu wasanaeth arall sy’n danfon erbyn y diwrnod busnes nesaf',
    ],
    ['values.noticeMethods.PERSONALLY_HANDED', 'Drwy ei danfon yn bersonol neu ei gadael gyda rhywun'],
    ['dateIssued', 'Dyddiad cychwyn'],
  ])('keeps the Welsh Language Unit wording for %s', (key, welsh) => {
    const value = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], cyViewTheClaim as unknown);
    expect(value).toBe(welsh);
  });

  it.each([
    [
      'LANDLORD_NOTICE_PERIODIC_S178',
      'Hysbysiad landlord a roddwyd mewn perthynas â chontract cyfnodol safonol (adran 178)',
    ],
    [
      'SERIOUS_ARREARS_PERIODIC_S181',
      'Deilydd contract o dan gontract cyfnodol safonol gydag ôl-ddyledion rhent difrifol (adran 181)',
    ],
    [
      'SERIOUS_ARREARS_FIXED_TERM_S187',
      'Deilydd contract o dan gontract safonol cyfnod penodol gydag ôl-ddyledion rhent difrifol (adran 187)',
    ],
    [
      'CONVERTED_FIXED_TERM_SCH12_25B2',
      'Rhoddwyd hysbysiad mewn perthynas â diwedd contract safonol cyfnod penodol wedi’i addasu (paragraff 25B(2) o Atodlen 12)',
    ],
  ])('uses the Welsh Language Unit wording for ground %s', (code, welsh) => {
    expect((cyViewTheClaim.values.groundNames as Record<string, string>)[code]).toBe(welsh);
  });

  it('shows the tenancy start date in Welsh when only the details-tab date is available', async () => {
    const { page, t } = await pageFor('cy', { licenceStartDate: undefined });

    expect(valueFor(page, t('viewTheClaim:labels.tenancyStartDate'))).toBe('1 Ionawr 2020');
  });

  it('shows a Welsh community landlord as Landlord cymunedol', async () => {
    // Term from the Welsh text of the Renting Homes (Wales) Act 2016, section 9.
    const { page } = await pageFor('cy', {
      claimantType: { value: { code: 'COMMUNITY_LANDLORD', label: 'Community landlord' } },
    });

    expect(page.introText).toContain('Landlord cymunedol');
    expect(page.introText).not.toContain('Community landlord');
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

// Every ground code pcs-api can send (PossessionGroundEnum implementations, pcs-api master 7 Oct 2026).
const PCS_API_GROUND_CODES = [
  'ABSOLUTE_GROUNDS',
  'ADAPTED_ACCOMMODATION',
  'ALTERNATIVE_ACCOMMODATION_GROUND9',
  'ANTISOCIAL_BEHAVIOUR_GROUND7A',
  'ANTISOCIAL_BEHAVIOUR_S157',
  'ANTI_SOCIAL',
  'BREACH_OF_THE_TENANCY',
  'BREACH_TENANCY_GROUND12',
  'BUILDING_WORKS',
  'CHARITABLE_LANDLORD',
  'CHARITIES',
  'CONVERTED_FIXED_TERM_SCH12_25B2',
  'DEATH_OF_TENANT_GROUND7',
  'DETERIORATION_FURNITURE_GROUND15',
  'DETERIORATION_PROPERTY_GROUND13',
  'DISABLED_SUITABLE_DWELLING',
  'DOMESTIC_VIOLENCE',
  'DOMESTIC_VIOLENCE_GROUND14A',
  'EMPLOYEE_LANDLORD_GROUND16',
  'ESTATE_MANAGEMENT_GROUNDS_S160',
  'FAILURE_TO_GIVE_UP_POSSESSION_S170',
  'FAILURE_TO_GIVE_UP_POSSESSION_S191',
  'FAIL_TO_GIVE_UP_BREAK_NOTICE_S191',
  'FALSE_STATEMENT_GROUND17',
  'FURNITURE_DETERIORATION',
  'HOLIDAY_LET_GROUND3',
  'HOUSING_ASSOCIATIONS_AND_TRUSTS',
  'HOUSING_ASSOCIATION_SPECIAL_CIRCUMSTANCES',
  'JOINT_CONTRACT_HOLDERS',
  'LANDLORD_BREAK_CLAUSE_S199',
  'LANDLORD_NOTICE_FT_END_S186',
  'LANDLORD_NOTICE_PERIODIC_S178',
  'LANDLORD_NOTICE_S186',
  'LANDLORD_NOTICE_S199',
  'LANDLORD_WORKS',
  'MINISTER_RELIGION_GROUND5',
  'NO_GROUNDS',
  'NO_RIGHT_TO_RENT_GROUND7B',
  'NUISANCE_ANNOYANCE_GROUND14',
  'NUISANCE_OR_IMMORAL_USE',
  'OFFENCE_RIOT_GROUND14ZA',
  'OTHER',
  'OTHER_BREACH_OF_CONTRACT_S157',
  'OTHER_ESTATE_MANAGEMENT_REASONS',
  'OVERCROWDING',
  'OWNER_OCCUPIER_GROUND1',
  'PERSISTENT_DELAY_GROUND11',
  'PREMIUM_PAID_MUTUAL_EXCHANGE',
  'PROPERTY_DETERIORATION',
  'PROPERTY_SOLD',
  'REDEVELOPMENT_GROUND6',
  'REDEVELOPMENT_SCHEMES',
  'REFUSAL_TO_MOVE_BACK',
  'RENT_ARREARS',
  'RENT_ARREARS_GROUND10',
  'RENT_ARREARS_OR_BREACH_OF_TENANCY',
  'RENT_ARREARS_S157',
  'REPOSSESSION_GROUND2',
  'RESERVE_SUCCESSORS',
  'RIOT_OFFENCE',
  'S84A_CONDITION_1',
  'S84A_CONDITION_2',
  'S84A_CONDITION_3',
  'S84A_CONDITION_4',
  'S84A_CONDITION_5',
  'SERIOUS_ARREARS_FIXED_TERM_S187',
  'SERIOUS_ARREARS_PERIODIC_S181',
  'SERIOUS_RENT_ARREARS_GROUND8',
  'SPECIAL_NEEDS_ACCOMMODATION',
  'SPECIAL_NEEDS_DWELLINGS',
  'STUDENT_LET_GROUND4',
  'TENANCY_OBTAINED_BY_FALSE_STATEMENT',
  'TIED_ACCOMMODATION_NEEDED_FOR_EMPLOYEE',
  'UNDER_OCCUPYING_AFTER_SUCCESSION',
  'UNREASONABLE_CONDUCT_TIED_ACCOMMODATION',
];

describe('Welsh ground names', () => {
  it('has a Welsh name for every ground code pcs-api sends', () => {
    const welsh = (cyViewTheClaim.values as Record<string, Record<string, unknown>>).groundNames;
    expect(PCS_API_GROUND_CODES.filter(code => !welsh[code])).toEqual([]);
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

describe('View the claim values that arrive as codes or without a code', () => {
  const welshValue = async (overrides: Record<string, unknown>, label: string) => {
    const { page, t } = await pageFor('cy', overrides);
    return valueFor(page, t(`viewTheClaim:labels.${label}`));
  };

  it('shows a tenancy type code in Welsh', async () => {
    expect(
      await welshValue(
        { detailsTab_OccupationContractLicenceDetails: { agreementType: 'STANDARD_CONTRACT' } },
        'tenancyType'
      )
    ).toBe('Contract safonol');
  });

  it('shows a notice method code in Welsh', async () => {
    expect(
      await welshValue(
        { detailsTab_NoticeDetails: { noticeServed: 'Yes', noticeMethod: 'EMAIL' } },
        'noticeServiceMethod'
      )
    ).toBe('Drwy e-bost');
  });

  it('shows a rent frequency code in Welsh', async () => {
    expect(
      await welshValue({ detailsTab_RentArrearsDetails: { calculationFrequency: 'MONTHLY' } }, 'howIsRentCalculated')
    ).toBe('Pob mis');
  });

  it('shows a Housing Act section code in Welsh', async () => {
    expect(
      await welshValue({ detailsTab_DemotionOfTenancyDetails: { housingAct: 'SECTION_82A_2' } }, 'demotionHousingAct')
    ).toBe('Adran 82A(2) Deddf Tai 1985');
  });

  it('shows a claimant type sent only as a code in Welsh', async () => {
    const { page } = await pageFor('cy', { claimantType: { valueCode: 'PRIVATE_LANDLORD' } });

    expect(page.introText).toContain('Landlord preifat');
    expect(page.introText).not.toContain('PRIVATE_LANDLORD');
  });

  it('keeps English for code-only values on the English page', async () => {
    const { page, t } = await pageFor('en', {
      detailsTab_OccupationContractLicenceDetails: { agreementType: 'STANDARD_CONTRACT' },
      claimantType: { valueCode: 'PRIVATE_LANDLORD' },
    });

    expect(valueFor(page, t('viewTheClaim:labels.tenancyType'))).toBe('Standard contract');
    expect(page.introText).toContain('Private landlord');
  });

  it('shows a ground that has a label but no code in Welsh', async () => {
    expect(
      await welshValue({ claimGroundSummaries: [{ value: { label: 'Antisocial behaviour' } }] }, 'groundsForPossession')
    ).toContain('Ymddygiad gwrthgymdeithasol');
  });

  it('shows the breach of tenancy code in Welsh', async () => {
    expect(
      await welshValue({ claimGroundSummaries: [{ value: { code: 'BREACH_OF_TENANCY' } }] }, 'groundsForPossession')
    ).toContain('Torri’r denantiaeth');
  });

  it('shows a not sure answer in Welsh whatever its spelling', async () => {
    expect(
      await welshValue(
        { detailsTab_ClaimantRegistrationAndLicensingDetails: { isExemptLandlord: 'I’m not sure' } },
        'isExemptLandlord'
      )
    ).toBe('Ddim yn siŵr');
  });

  it('still shows an unexpected answer rather than hiding the row', async () => {
    expect(
      await welshValue(
        { detailsTab_ClaimantRegistrationAndLicensingDetails: { isExemptLandlord: 'MAYBE_LATER' } },
        'isExemptLandlord'
      )
    ).toBe('Maybe later');
  });

  it('shows a short September date in Welsh', async () => {
    expect(
      await welshValue(
        {
          licenceStartDate: undefined,
          detailsTab_OccupationContractLicenceDetails: {
            agreementType: 'Standard contract',
            agreementStartDate: '5 Sep 2024',
          },
        },
        'tenancyStartDate'
      )
    ).toBe('5 Medi 2024');
  });

  it('keeps free text that happens to be in capitals exactly as typed', () => {
    const copy = { value: (_key: string, english: string) => english } as unknown as ViewTheClaimCopy;
    expect(localisedValue(copy, 'rentFrequencies', {}, 'QUARTERLY')).toBe('QUARTERLY');
    expect(localisedValue(copy, 'rentFrequencies', {}, 'EVERY 4 WEEKS')).toBe('EVERY 4 WEEKS');
  });

  it('shows an unknown code as a sentence, not the raw code', () => {
    const copy = { value: (_key: string, english: string) => english } as unknown as ViewTheClaimCopy;
    expect(localisedValue(copy, 'statementOfTruthCompletedBy', {}, 'CLAIMANT_LITIGATION_FRIEND')).toBe(
      'Claimant litigation friend'
    );
    expect(localisedValue(copy, 'statementOfTruthCompletedBy', {}, 'Jane Smith')).toBe('Jane Smith');
  });

  it('shows persons unknown in Welsh whatever the casing', async () => {
    const { page, t } = await pageFor('cy', {
      allDefendants: [{ value: { firstName: 'person unknown', lastName: 'PERSON UNKNOWN' } }],
    });
    const defendant = page.sections.find(section => section.title === t('viewTheClaim:sections.defendantDetails'));

    expect(defendant?.rows[0].value.text).toBe('Unigolion yn anhysbys');
  });

  it.each(['1 Jan 2020', '1st January 2020', '01/01/2020', '1 January 2020, 3:30:00PM'])(
    'shows the details-tab date %s in Welsh',
    async agreementStartDate => {
      expect(
        await welshValue(
          {
            licenceStartDate: undefined,
            detailsTab_OccupationContractLicenceDetails: { agreementType: 'Standard contract', agreementStartDate },
          },
          'tenancyStartDate'
        )
      ).toBe('1 Ionawr 2020');
    }
  );

  it('shows the type of notice served exactly as the claimant typed it', async () => {
    expect(
      await welshValue(
        { detailsTab_NoticeDetails: { noticeServed: 'Yes', typeOfNoticeServed: 'Section 173 notice' } },
        'noticeType'
      )
    ).toBe('Section 173 notice');
  });
});

describe('Ground labels used to recognise pcs-api grounds', () => {
  it('has an English label for every ground with Welsh, matching the English page text', () => {
    const englishNames = enViewTheClaim.values.groundNames as Record<string, string>;
    const mismatched = Object.keys(englishNames).filter(code => GROUND_LABELS[code] !== englishNames[code]);
    expect(mismatched).toEqual([]);
  });
});
