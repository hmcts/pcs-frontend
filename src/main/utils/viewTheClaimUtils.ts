import escapeHTML from 'escape-html';
import { DateTime } from 'luxon';
import type { TFunction } from 'i18next';

import type { CcdCaseAddress, CcdCaseData } from '@services/ccdCase.interface';
import { extractCaseDocuments } from '@utils/documentUtils';
import type { CaseDocumentLookupItem } from '@utils/documentUtils';

export interface ViewTheClaimSummaryRow {
  key: {
    text: string;
  };
  value: {
    text?: string;
    html?: string;
  };
  actions: {
    items: [];
  };
}

export interface ViewTheClaimSection {
  title: string;
  rows: ViewTheClaimSummaryRow[];
}

export interface ViewTheClaimDownloadSection {
  title: string;
  rows: ViewTheClaimSummaryRow[];
}

export interface ViewTheClaimPageData {
  caseReference: string;
  propertyAddressHtml?: string;
  propertyAddressText?: string;
  introText: string;
  pageMetadataRows: ViewTheClaimSummaryRow[];
  claimPdfSection: ViewTheClaimDownloadSection;
  sections: ViewTheClaimSection[];
  documentsUrl: string;
}

type UnknownRecord = Record<string, unknown>;

interface CollectionRecord {
  id?: string;
  value: UnknownRecord;
}

const PERSONS_UNKNOWN = 'Persons unknown';

const YES_NO_LABELS: Record<string, string> = {
  YES: 'Yes',
  NO: 'No',
  NOT_SURE: 'Not sure',
  IM_NOT_SURE: 'Not sure',
  IMNOTSURE: 'Not sure',
};

const TENANCY_TYPE_LABELS: Record<string, string> = {
  ASSURED_TENANCY: 'Assured tenancy',
  SECURE_TENANCY: 'Secure tenancy',
  INTRODUCTORY_TENANCY: 'Introductory tenancy',
  FLEXIBLE_TENANCY: 'Flexible tenancy',
  DEMOTED_TENANCY: 'Demoted tenancy',
  STANDARD_CONTRACT: 'Standard contract',
  SECURE_CONTRACT: 'Secure contract',
  OTHER: 'Other',
};

const NOTICE_SERVICE_METHOD_LABELS: Record<string, string> = {
  DELIVERED_PERMITTED_PLACE: 'By delivering it to or leaving it at a permitted place',
  EMAIL: 'By email',
  FIRST_CLASS_POST: 'By first class post or other service which provides for delivery on the next business day',
  OTHER: 'Other',
  OTHER_ELECTRONIC: 'By other electronic method',
  PERSONALLY_HANDED: 'By personally handing it to or leaving it with someone',
};

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

const STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS: Record<string, string> = {
  CLAIMANT: 'Claimant',
  LEGAL_REPRESENTATIVE: "Claimant's legal representative (as defined by CPR 2.3 (1))",
};

const GROUND_LABELS: Record<string, string> = {
  ABSOLUTE_GROUNDS: 'Absolute grounds',
  ADAPTED_ACCOMMODATION: 'Adapted accommodation (ground 13)',
  ALTERNATIVE_ACCOMMODATION_GROUND9: 'Suitable alternative accommodation (ground 9)',
  ANTI_SOCIAL: 'Antisocial behaviour',
  ANTISOCIAL_BEHAVIOUR_S157: 'Antisocial behaviour (breach of contract) (section 157)',
  BREACH_OF_TENANCY: 'Breach of the tenancy',
  BREACH_OF_THE_TENANCY: 'Breach of the tenancy',
  BREACH_TENANCY_GROUND12: 'Breach of tenancy conditions (ground 12)',
  BUILDING_WORKS: 'Building works (ground A)',
  CHARITABLE_LANDLORD: 'Charitable landlords (ground 11)',
  CHARITIES: 'Charities (ground C)',
  DETERIORATION_FURNITURE_GROUND15: 'Deterioration of furniture (ground 15)',
  DETERIORATION_PROPERTY_GROUND13: 'Deterioration in the condition of the property (ground 13)',
  DISABLED_SUITABLE_DWELLING: 'Dwelling suitable for disabled people (ground D)',
  DOMESTIC_VIOLENCE: 'Domestic violence (ground 2A)',
  DOMESTIC_VIOLENCE_GROUND14A: 'Domestic violence (ground 14A)',
  EMPLOYEE_LANDLORD_GROUND16: 'Employee of the landlord (ground 16)',
  ESTATE_MANAGEMENT_GROUNDS_S160: 'Estate management grounds (section 160)',
  FAILURE_TO_GIVE_UP_POSSESSION_S170:
    "Failure to give up possession on date specified in contract-holder's notice (section 170)",
  FAILURE_TO_GIVE_UP_POSSESSION_S191:
    "Failure to give up possession on date specified in contract-holder's break clause notice (section 191)",
  FALSE_STATEMENT_GROUND17: 'Tenancy obtained by false statement (ground 17)',
  FURNITURE_DETERIORATION: 'Deterioration of furniture (ground 4)',
  HOUSING_ASSOCIATION_SPECIAL_CIRCUMSTANCES: 'Housing association special circumstances accommodation (ground 14)',
  HOUSING_ASSOCIATIONS_AND_TRUSTS: 'Housing associations and housing trusts: people difficult to house (ground E)',
  JOINT_CONTRACT_HOLDERS: 'Joint contract-holders (ground H)',
  LANDLORD_NOTICE_S186: "Landlord's notice in connection with end of fixed term given (section 186)",
  LANDLORD_NOTICE_S199: "Notice given under a landlord's break clause (section 199)",
  LANDLORD_WORKS: "Landlord's works (ground 10)",
  NUISANCE_ANNOYANCE_GROUND14: 'Nuisance, annoyance, illegal or immoral use of the property (ground 14)',
  NUISANCE_OR_IMMORAL_USE: 'Nuisance, annoyance, illegal or immoral use of the property (ground 2)',
  OFFENCE_RIOT_GROUND14ZA: 'Offence during a riot (ground 14ZA)',
  OTHER: 'Other',
  OTHER_BREACH_OF_CONTRACT_S157: 'Other breach of contract (section 157)',
  OTHER_ESTATE_MANAGEMENT_REASONS: 'Other estate management reasons (ground I)',
  OVERCROWDING: 'Overcrowding (ground 9)',
  PERSISTENT_DELAY_GROUND11: 'Persistent delay in paying rent (ground 11)',
  PREMIUM_PAID_MUTUAL_EXCHANGE: 'Premium paid in connection with mutual exchange (ground 6)',
  PROPERTY_DETERIORATION: 'Deterioration in the condition of the property (ground 3)',
  PROPERTY_SOLD: 'Property sold for redevelopment (ground 10A)',
  REDEVELOPMENT_SCHEMES: 'Redevelopment schemes (ground B)',
  REFUSAL_TO_MOVE_BACK: 'Refusal to move back to main home after works completed (ground 8)',
  RENT_ARREARS: 'Rent arrears',
  RENT_ARREARS_GROUND10: 'Rent arrears (ground 10)',
  RENT_ARREARS_OR_BREACH_OF_TENANCY: 'Rent arrears or breach of the tenancy (ground 1)',
  RENT_ARREARS_S157: 'Rent arrears (breach of contract) (section 157)',
  RESERVE_SUCCESSORS: 'Reserve successors (ground G)',
  RIOT_OFFENCE: 'Offence during a riot (ground 2ZA)',
  SERIOUS_RENT_ARREARS_GROUND8: 'Serious rent arrears (ground 8)',
  SPECIAL_NEEDS_ACCOMMODATION: 'Special needs accommodation (ground 15)',
  SPECIAL_NEEDS_DWELLINGS: 'Groups of dwellings for people with special needs (ground F)',
  TENANCY_OBTAINED_BY_FALSE_STATEMENT: 'Tenancy obtained by false statement (ground 5)',
  TIED_ACCOMMODATION_NEEDED_FOR_EMPLOYEE: 'Tied accommodation needed for another employee (ground 12)',
  UNDER_OCCUPYING_AFTER_SUCCESSION: 'Under occupying after succession (ground 15A)',
  UNREASONABLE_CONDUCT_TIED_ACCOMMODATION: 'Unreasonable conduct in tied accommodation (ground 7)',
};

const GROUND_COLLECTION_PATHS = [
  'introGrounds_IntroductoryDemotedOrOtherGrounds',
  'rentArrears_RentArrearsGrounds',
  'rentArrears_AdditionalMandatoryGrounds',
  'rentArrears_AdditionalDiscretionaryGrounds',
  'noRentArrears_MandatoryGrounds',
  'noRentArrears_DiscretionaryGrounds',
  'secureOrFlexibleMandatoryGrounds',
  'secureOrFlexibleDiscretionaryGrounds',
  'secureOrFlexibleMandatoryGroundsAlt',
  'secureOrFlexibleDiscretionaryGroundsAlt',
  'secureGroundsWales_MandatoryGrounds',
  'secureGroundsWales_DiscretionaryGrounds',
  'possessionGroundsWales_MandatoryGrounds',
  'possessionGroundsWales_DiscretionaryGrounds',
  'estateManagementGroundsWales',
];

const REASON_FIELDS = [
  { path: 'absoluteGrounds', label: 'Absolute grounds' },
  { path: 'antiSocialBehaviourGround', label: 'Antisocial behaviour' },
  { path: 'antiSocialGround', label: 'Antisocial behaviour' },
  { path: 'breachOfTheTenancyGround', label: 'Breach of the tenancy' },
  { path: 'breachOfTenancyGround', label: 'Breach of the tenancy (ground 1)' },
  { path: 'breachOfTenancyConditionsReason', label: 'Breach of tenancy conditions (ground 12)' },
  { path: 'domesticViolenceGround', label: 'Domestic violence (ground 2A)' },
  { path: 'domesticViolenceReason', label: 'Domestic violence (ground 14A)' },
  { path: 'ownerOccupierReason', label: 'Owner occupier (ground 1)' },
  { path: 'studentLetReason', label: 'Student let (ground 4)' },
  { path: 'suitableAltAccommodationReason', label: 'Suitable alternative accommodation (ground 9)' },
  { path: 'assuredNoArrearsReasons_AntisocialBehaviour', label: 'Antisocial behaviour (ground 7A)' },
  { path: 'assuredNoArrearsReasons_BreachOfTenancyConditions', label: 'Breach of tenancy conditions (ground 12)' },
  { path: 'assuredNoArrearsReasons_DeathOfTenant', label: 'Death of the tenant (ground 7)' },
  { path: 'assuredNoArrearsReasons_DomesticViolence', label: 'Domestic violence (ground 14A)' },
  { path: 'assuredNoArrearsReasons_FalseStatement', label: 'Tenancy obtained by false statement (ground 17)' },
  { path: 'assuredNoArrearsReasons_FurnitureDeterioration', label: 'Deterioration of furniture (ground 15)' },
  { path: 'assuredNoArrearsReasons_HolidayLet', label: 'Holiday let (ground 3)' },
  { path: 'assuredNoArrearsReasons_LandlordEmployee', label: 'Employee of the landlord (ground 16)' },
  {
    path: 'assuredNoArrearsReasons_MinisterOfReligion',
    label: 'Property required for minister of religion (ground 5)',
  },
  { path: 'assuredNoArrearsReasons_NoRightToRent', label: 'Tenant does not have a right to rent (ground 7B)' },
  {
    path: 'assuredNoArrearsReasons_NuisanceOrIllegalUse',
    label: 'Nuisance, annoyance, illegal or immoral use of the property (ground 14)',
  },
  { path: 'assuredNoArrearsReasons_OffenceDuringRiot', label: 'Offence during a riot (ground 14ZA)' },
  { path: 'assuredNoArrearsReasons_OwnerOccupier', label: 'Owner occupier (ground 1)' },
  {
    path: 'assuredNoArrearsReasons_PropertyDeterioration',
    label: 'Deterioration in the condition of the property (ground 13)',
  },
  { path: 'assuredNoArrearsReasons_Redevelopment', label: 'Property required for redevelopment (ground 6)' },
  {
    path: 'assuredNoArrearsReasons_RepossessionByLender',
    label: "Repossession by the landlord's mortgage lender (ground 2)",
  },
  { path: 'assuredNoArrearsReasons_StudentLet', label: 'Student let (ground 4)' },
  {
    path: 'assuredNoArrearsReasons_SuitableAlternativeAccomodation',
    label: 'Suitable alternative accommodation (ground 9)',
  },
  {
    path: 'walesFailToGiveUpS170Reason',
    label: "Failure to give up possession on date specified in contract-holder's notice (section 170)",
  },
  {
    path: 'walesFailToGiveUpBreakNoticeS191Reason',
    label: "Failure to give up possession on date specified in contract-holder's break clause notice (section 191)",
  },
  {
    path: 'walesLandlordNoticeFtEndS186Reason',
    label: "Landlord's notice in connection with end of fixed term given (section 186)",
  },
  { path: 'walesLandlordBreakClauseS199Reason', label: "Notice given under a landlord's break clause (section 199)" },
  { path: 'walesOtherBreachSection157Reason', label: 'Other breach of contract (section 157)' },
  {
    path: 'walesSecureFailureToGiveUpPossessionSection170Reason',
    label: "Failure to give up possession on date specified in contract-holder's notice (section 170)",
  },
  {
    path: 'walesSecureFailureToGiveUpPossessionSection191Reason',
    label: "Failure to give up possession on date specified in contract-holder's break clause notice (section 191)",
  },
  {
    path: 'walesSecureLandlordNoticeSection186Reason',
    label: "Landlord's notice in connection with end of fixed term given (section 186)",
  },
  {
    path: 'walesSecureLandlordNoticeSection199Reason',
    label: "Notice given under a landlord's break clause (section 199)",
  },
  { path: 'walesSecureOtherBreachOfContractReason', label: 'Other breach of contract (section 157)' },
];

export function buildViewTheClaimPageData(
  caseReference: string,
  caseData: CcdCaseData,
  t: TFunction
): ViewTheClaimPageData {
  const data = caseData as UnknownRecord;
  const documents = extractCaseDocuments(data);
  const propertyAddress = data.propertyAddress;
  const propertyAddressHtml = addressHtml(propertyAddress);
  const propertyAddressText = addressText(propertyAddress);
  const claimant = claimantName(data);
  const claimIssueDateText = formatDate(getValue(data, 'claimIssueDate'));
  const claimSubmittedDateText = formatDate(getFirstValue(data, ['submittedOn', 'claimSubmittedDate']));
  const pageMetadataRows = sectionRows([
    claimIssueDateText
      ? summaryRow(t('viewTheClaim:dateIssued', { defaultValue: 'Date issued' }), { text: claimIssueDateText })
      : undefined,
    claimSubmittedDateText
      ? summaryRow(t('viewTheClaim:dateSubmitted', { defaultValue: 'Date submitted' }), { text: claimSubmittedDateText })
      : undefined,
  ]);

  const sections = [
    buildClaimantSection(data),
    buildDefendantSection(data, propertyAddress),
    ...buildAdditionalDefendantSections(data, propertyAddress),
    buildClaimDetailsSection(data, propertyAddress),
    buildWelshAsbSection(data),
    buildRentArrearsSection(data, documents, caseReference),
    buildActionTakenSection(data),
    buildNoticeDetailsSection(data, documents, caseReference),
    buildTenancySection(data, documents, caseReference),
    buildClaimantCircumstancesSection(data),
    buildDefendantCircumstancesSection(data),
    buildUnderlesseeTriageSection(data),
    buildUnderlesseeSection(data, propertyAddress),
    ...buildAdditionalUnderlesseeSections(data, propertyAddress),
    buildDemotionSection(data),
    buildSuspensionSection(data),
    buildProhibitedConductSection(data),
    buildRequiredDocumentsSection(data, documents, caseReference),
    buildStatementOfTruthSection(data),
  ].filter((item): item is ViewTheClaimSection => !!item && item.rows.length > 0);

  return {
    caseReference,
    propertyAddressHtml,
    propertyAddressText,
    introText: claimant
      ? t('viewTheClaim:introText', {
          defaultValue:
            '{{claimantName}} has made a property possession claim against you. These are their answers to the questions they were asked when making their claim.',
          claimantName: claimant,
        })
      : t('viewTheClaim:introTextFallback', {
          defaultValue:
            "A property possession claim has been made against you. These are the claimant's answers to the questions they were asked when making their claim.",
        }),
    pageMetadataRows,
    claimPdfSection: buildClaimPdfSection(documents, caseReference, t),
    sections,
    documentsUrl: `/case/${caseReference}/view-documents`,
  };
}

function buildClaimPdfSection(
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  t: TFunction
): ViewTheClaimDownloadSection {
  const claimDocument = documents.find(
    document =>
      document.categoryId === 'statementsOfCase' ||
      document.filename.toLowerCase().includes('claim')
  );

  return {
    title: t('viewTheClaim:claimPdfSectionTitle', { defaultValue: 'Download a PDF copy of the claim' }),
    rows: [
      summaryRow(
        t('viewTheClaim:claimPdfLabel', { defaultValue: 'Claim (PDF)' }),
        claimDocument
          ? { html: linkHtml(t('viewTheClaim:claimPdfLabel', { defaultValue: 'Claim (PDF)' }), `/case/${caseReference}/view-documents/${claimDocument.id}`) }
          : { text: t('viewTheClaim:claimPdfLabel', { defaultValue: 'Claim (PDF)' }) }
      ),
    ],
  };
}

function buildClaimantSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow('Name', claimantName(data)),
    htmlRow('Address for service', claimantAddressHtml(data)),
    textRow(
      'Is the claimant an exempt landlord under Part 1 of the Housing (Wales) Act 2014?',
      yesNoText(getValue(data, 'isExemptLandlord'))
    ),
  ];

  return section('Claimant details', rows);
}

function buildDefendantSection(data: UnknownRecord, propertyAddress: unknown): ViewTheClaimSection | undefined {
  const defendant = firstDefendantParty(data);

  const rows = [
    textRow('Name', partyName(defendant)),
    htmlRow('Address for service', partyAddressHtml(defendant, propertyAddress)),
  ];

  return section('Defendant 1 details', rows);
}

function buildAdditionalDefendantSections(data: UnknownRecord, propertyAddress: unknown): ViewTheClaimSection[] {
  const defendants = additionalDefendantParties(data);

  return defendants
    .map((defendant, index) =>
      section(`Additional defendant ${index + 1} details`, [
        textRow('Name', partyName(defendant)),
        htmlRow('Address for service', partyAddressHtml(defendant, propertyAddress)),
      ])
    )
    .filter((sectionItem): sectionItem is ViewTheClaimSection => !!sectionItem);
}

function buildClaimDetailsSection(data: UnknownRecord, propertyAddress: unknown): ViewTheClaimSection | undefined {
  const rows = [
    htmlRow('Address of the property the claimant is seeking possession of', addressHtml(propertyAddress)),
    textRow(
      'Does the claimant have grounds for possession?',
      yesNoText(getFirstValue(data, ['introGrounds_HasIntroductoryDemotedOtherGroundsForPossession']))
    ),
    htmlRow('Grounds for possession', listHtml(groundLabels(data))),
    htmlRow('Description of grounds', listHtml(otherGroundDescriptions(data))),
    ...groundReasonRows(data),
    textRow('Why is the claimant claiming possession?', getFirstString(data, ['noGrounds', 'absoluteGrounds'])),
    textRow(
      'Is there any other information the claimant wants to provide about their reasons for possession?',
      yesNoText(getValue(data, 'additionalReasonsForPossession.hasReasons'))
    ),
    textRow('Additional reasons for possession', getString(data, 'additionalReasonsForPossession.reasons')),
  ];

  return section('Claim details', rows);
}

function buildWelshAsbSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'Is it alleged that there is actual or threatened antisocial behaviour?',
      yesNoText(getValue(data, 'walesAntisocialBehaviour'))
    ),
    textRow(
      'Details of alleged actual or threatened antisocial behaviour',
      getString(data, 'walesAntisocialBehaviourDetails')
    ),
    textRow(
      'Is it alleged that there is actual or threatened use of the premises for illegal purposes?',
      yesNoText(getValue(data, 'walesIllegalPurposesUse'))
    ),
    textRow(
      'Details of alleged actual or threatened use of the premises for illegal purposes',
      getString(data, 'walesIllegalPurposesUseDetails')
    ),
    textRow(
      'Is it is alleged that there has been other prohibited conduct?',
      yesNoText(getValue(data, 'walesOtherProhibitedConduct'))
    ),
    textRow('Details of other alleged prohibited conduct', getString(data, 'walesOtherProhibitedConductDetails')),
  ];

  return section('Alleged antisocial behaviour and illegal or prohibited conduct - WALES ONLY', rows);
}

function buildRentArrearsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string
): ViewTheClaimSection | undefined {
  const rows = [
    textRow('Rent amount', formatMoney(getValue(data, 'rentDetails_CurrentRent'))),
    textRow('How is rent calculated?', enumText(getValue(data, 'rentDetails_Frequency'), FREQUENCY_LABELS)),
    textRow('Total rent arrears at time of issue', formatMoney(getValue(data, 'rentArrears_Total'))),
    textRow(
      'Have there been previous steps taken to recover rent arrears?',
      yesNoText(getValue(data, 'rentArrears_RecoveryAttempted'))
    ),
    textRow(
      'Details of previous steps taken to recover rent arrears',
      getString(data, 'rentArrears_RecoveryAttemptDetails')
    ),
    textRow('Judgment requested for the outstanding arrears?', yesNoText(getValue(data, 'arrearsJudgmentWanted'))),
    htmlRow(
      'Rent statement',
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['RENT_STATEMENT'],
      })
    ),
  ];

  return section('Details of rent arrears - RENT ARREARS CLAIMS ONLY', rows);
}

function buildActionTakenSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow('Has the pre-action protocol been followed?', yesNoText(getValue(data, 'preActionProtocolCompleted'))),
    textRow(
      'Why has the pre-action protocol not been followed?',
      getFirstString(data, [
        'preActionProtocolIncompleteExplanation',
        'preActionProtocolNotCompletedReason',
        'preActionProtocolReason',
      ])
    ),
    textRow('Has mediation been attempted?', yesNoText(getValue(data, 'mediationAttempted'))),
    textRow('Has a settlement tried to be reached?', yesNoText(getValue(data, 'settlementAttempted'))),
  ];

  return section('Action already taken by the claimant', rows);
}

function buildNoticeDetailsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string
): ViewTheClaimSection | undefined {
  const noticeDateTime = noticeDateTimeValue(data);
  const rows = [
    textRow('Has notice been served?', yesNoText(getFirstValue(data, ['noticeServed', 'walesNoticeServed']))),
    textRow(
      'Statement of why notice has not been served',
      getFirstString(data, [
        'notice_NoticeNotServedReason',
        'notice_NoNoticeStatement',
        'walesNoNoticeStatement',
        'noticeStatement',
      ])
    ),
    textRow('Notice type', getString(data, 'walesTypeOfNoticeServed')),
    textRow('Method of service', enumText(getValue(data, 'notice_NoticeServiceMethod'), NOTICE_SERVICE_METHOD_LABELS)),
    textRow('Date notice was served', formatDate(noticeDateTime)),
    textRow('Time notice was served', formatTime(noticeDateTime)),
    textRow('Name of person the notice was left with', getString(data, 'notice_NoticePersonName')),
    textRow('Email address the notice was served to', getString(data, 'notice_NoticeEmailAddress')),
    textRow(
      'Details of how the notice was served by other electronic method',
      getString(data, 'notice_NoticeOtherElectronicMethodExplanation')
    ),
    textRow('Details of how the notice was served by other means', getString(data, 'notice_NoticeOtherExplanation')),
    textRow(
      'Can the claimant upload a copy of the notice served?',
      yesNoText(getFirstValue(data, ['notice_CanUploadNotice', 'notice_HasNoticeDocuments']))
    ),
    textRow(
      'Why can the claimant not upload a copy of the notice served?',
      getFirstString(data, ['notice_UnableToUploadNoticeReason', 'notice_NoNoticeDocumentsReason'])
    ),
    htmlRow(
      'Notice or certificate of service',
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['NOTICE_FOR_SERVICE_OUT_OF_JURISDICTION', 'NOTICE', 'CERTIFICATE_OF_SERVICE'],
      })
    ),
  ];

  return section('Notice details', rows);
}

function buildTenancySection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'What type of tenancy, occupation contract or licence is in place, or was in place?',
      enumText(getFirstValue(data, ['tenancy_TypeOfTenancyLicence', 'occupationLicenceTypeWales']), TENANCY_TYPE_LABELS)
    ),
    textRow(
      'Tenancy, occupation contract or licence start date',
      formatDate(getFirstValue(data, ['tenancy_TenancyLicenceDate', 'licenceStartDate']))
    ),
    textRow(
      'Does the claimant have a copy of the tenancy, occupation contract or licence agreement?',
      yesNoText(getValue(data, 'tenancy_HasCopyOfTenancyLicence'))
    ),
    textRow(
      'Why does the claimant not have a copy of the tenancy, occupation contract or licence agreement?',
      getString(data, 'tenancy_ReasonsForNoTenancyLicenceDocuments')
    ),
    htmlRow(
      'Tenancy, occupation contract or licence',
      documentLinksHtml(documents, caseReference, {
        filenameIncludes: ['tenancy', 'licence', 'license', 'occupation'],
      })
    ),
  ];

  return section('Tenancy, occupation contract or licence details', rows);
}

function buildClaimantCircumstancesSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'Is there any information the claimant wants to provide about their circumstances?',
      yesNoText(getValue(data, 'claimantCircumstancesSelect'))
    ),
    textRow('Details of claimant circumstances', getString(data, 'claimantCircumstancesDetails')),
  ];

  return section('Claimant circumstances', rows);
}

function buildDefendantCircumstancesSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'Is there any information the claimant is required to provide, or wants to provide about the defendants circumstances?',
      yesNoText(getValue(data, 'hasDefendantCircumstancesInfo'))
    ),
    textRow('Details of defendants circumstances', getString(data, 'defendantCircumstancesInfo')),
  ];

  return section('Defendants circumstances', rows);
}

function buildUnderlesseeTriageSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  return section('Underlessees or mortgagees entitled to claim relief against forfeiture', [
    textRow(
      'Is there an underlessee or mortgagee entitled to claim relief against forfeiture?',
      yesNoText(getValue(data, 'hasUnderlesseeOrMortgagee'))
    ),
  ]);
}

function buildUnderlesseeSection(data: UnknownRecord, propertyAddress: unknown): ViewTheClaimSection | undefined {
  const party = firstUnderlesseeParty(data);

  return section('Underlessee or mortgagee 1 details', [
    textRow('Name', underlesseeName(party)),
    htmlRow('Address for service', partyAddressHtml(party, propertyAddress)),
  ]);
}

function buildAdditionalUnderlesseeSections(data: UnknownRecord, propertyAddress: unknown): ViewTheClaimSection[] {
  const parties = additionalUnderlesseeParties(data);

  return parties
    .map((party, index) =>
      section(`Additional underlessee or mortgagee ${index + 1} details`, [
        textRow('Name', underlesseeName(party)),
        htmlRow('Address for service', partyAddressHtml(party, propertyAddress)),
      ])
    )
    .filter((sectionItem): sectionItem is ViewTheClaimSection => !!sectionItem);
}

function buildDemotionSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'In the alternative to possession, is the claimant asking the court to order demotion of tenancy?',
      selectedAlternative(data, 'DEMOTION_OF_TENANCY')
    ),
    textRow(
      'Which section of the Housing Act is the demotion of tenancy claim made under?',
      enumText(getFirstValue(data, ['demotionOfTenancy_HousingAct', 'demotionOfTenancyActs']), {
        SECTION_6A_2: 'Section 6A(2) of the Housing Act 1988',
        SECTION_82A_2: 'Section 82A(2) of the Housing Act 1985',
      })
    ),
    textRow(
      'Has the claimant served a statement of express terms on the defendants which will apply to the demoted tenancy?',
      yesNoText(getValue(data, 'demotionOfTenancy_StatementOfExpressTermsServed'))
    ),
    textRow('Details of terms', getString(data, 'demotionOfTenancy_StatementOfExpressTermsDetails')),
    textRow(
      'Reasons for requesting demotion of tenancy',
      getFirstString(data, ['demotionOfTenancy_Reason', 'demotionOrderReason'])
    ),
  ];

  return section('Demotion of tenancy', rows);
}

function buildSuspensionSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'In the alternative to possession, is the claimant asking the court to order suspension of right to buy?',
      selectedAlternative(data, 'SUSPENSION_OF_RIGHT_TO_BUY')
    ),
    textRow(
      'Which section of the Housing Act is the suspension of right to buy claim made under?',
      enumText(getFirstValue(data, ['suspensionOfRTB_HousingAct', 'suspensionOfRightToBuyActs']), {
        SECTION_121A: 'Section 121A of the Housing Act 1985',
        SECTION_6A_2: 'Section 6A(2) of the Housing Act 1988',
        SECTION_82A_2: 'Section 82A(2) of the Housing Act 1985',
      })
    ),
    textRow(
      'Reasons for requesting a suspension of right to buy',
      getFirstString(data, ['suspensionOfRTB_Reason', 'suspensionOrderReason'])
    ),
  ];

  return section('Suspension of right to buy', rows);
}

function buildProhibitedConductSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'Is the claimant seeking an order imposing a prohibited standard contract?',
      yesNoText(getValue(data, 'prohibitedConductWalesClaim'))
    ),
    textRow(
      'Has the claimant and the contract holder agreed terms of the periodic standard contract in addition to those incorporated by statute?',
      yesNoText(getValue(data, 'agreedTermsOfPeriodicContract'))
    ),
    textRow('Details of terms', getString(data, 'detailsOfTerms')),
    textRow('Why is the claimant making this claim?', getString(data, 'prohibitedConductWalesClaimDetails')),
  ];

  return section('Prohibited conduct standard contract', rows);
}

function buildRequiredDocumentsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      'Can the claimant upload a copy of the energy performance certificate?',
      yesNoText(getValue(data, 'energyPerformanceCertificateProvided'))
    ),
    textRow(
      'Why can the claimant not upload a copy of the energy performance certificate?',
      getString(data, 'noEnergyPerformanceCertificateReason')
    ),
    htmlRow(
      'Energy performance certificate',
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['ENERGY_PERFORMANCE_CERTIFICATE'],
      })
    ),
    textRow(
      'Can the claimant upload a copy of the current gas safety report?',
      yesNoText(getValue(data, 'gasSafetyReportProvided'))
    ),
    textRow(
      'Why can the claimant not upload a copy of the current gas safety report?',
      getString(data, 'noGasSafetyReportReason')
    ),
    htmlRow(
      'Current gas safety report',
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['GAS_SAFETY_REPORT'],
      })
    ),
    textRow(
      'Can the claimant upload a copy of the current Electrical Installation Condition Report (EICR)?',
      yesNoText(getValue(data, 'electricalInstallationConditionProvided'))
    ),
    textRow(
      'Why can the claimant not upload a copy of the Electrical Installation Condition Report (EICR)?',
      getString(data, 'noElectricalInstallationConditionReason')
    ),
    htmlRow(
      'Electrical Installation Condition Report (EICR)',
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['ELECTRICAL_INSTALLATION_CONDITION_REPORT'],
      })
    ),
  ];

  return section('Required documents', rows);
}

function buildStatementOfTruthSection(data: UnknownRecord): ViewTheClaimSection | undefined {
  const statementOfTruth = asRecord(getValue(data, 'statementOfTruth'));
  if (!statementOfTruth) {
    return undefined;
  }

  const rows = [
    textRow('Completed by', enumText(statementOfTruth?.completedBy, STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS)),
    textRow('Name', getFirstString(statementOfTruth ?? {}, ['fullNameLegalRep', 'fullNameClaimant'])),
    textRow('Name of firm', getFirstString(statementOfTruth ?? {}, ['firmNameLegalRep']) ?? claimantName(data)),
    textRow(
      'Position or office held',
      getFirstString(statementOfTruth ?? {}, ['positionLegalRep', 'positionClaimant'])
    ),
  ];

  return section('Statement of truth', rows);
}

function section(title: string, rows: (ViewTheClaimSummaryRow | undefined)[]): ViewTheClaimSection | undefined {
  const visibleRows = sectionRows(rows);
  return visibleRows.length > 0 ? { title, rows: visibleRows } : undefined;
}

function sectionRows(rows: (ViewTheClaimSummaryRow | undefined)[]): ViewTheClaimSummaryRow[] {
  return rows.filter((row): row is ViewTheClaimSummaryRow => !!row);
}

function summaryRow(label: string, value: { text: string } | { html: string }): ViewTheClaimSummaryRow {
  return {
    key: { text: label },
    value,
    actions: { items: [] },
  };
}

function textRow(label: string, value: string | undefined): ViewTheClaimSummaryRow | undefined {
  return value ? summaryRow(label, { text: value }) : undefined;
}

function htmlRow(label: string, value: string | undefined): ViewTheClaimSummaryRow | undefined {
  return value ? summaryRow(label, { html: value }) : undefined;
}

function claimantName(data: UnknownRecord): string | undefined {
  if (normaliseYesNo(getValue(data, 'isClaimantNameCorrect')) === 'NO') {
    return getFirstString(data, ['overriddenClaimantName', 'fallbackClaimantName', 'claimantName']);
  }

  return (
    listText(partyNames(collectionRecords(getValue(data, 'allClaimants')))) ??
    getFirstString(data, [
      'claimantName',
      'fallbackClaimantName',
      'possessionClaimResponse.claimantOrganisations.0.value',
    ]) ??
    dynamicListLabel(getValue(data, 'claimantType'))
  );
}

function claimantAddressHtml(data: UnknownRecord): string | undefined {
  if (normaliseYesNo(getValue(data, 'isCorrectClaimantContactAddress')) === 'NO') {
    return addressHtml(getValue(data, 'overriddenClaimantContactAddress'), { includeCountry: true });
  }

  return (
    collectionAddressesHtml(collectionRecords(getValue(data, 'allClaimants'))) ??
    addressHtml(getValue(data, 'organisationAddress'), { includeCountry: true }) ??
    formattedAddressHtml(getString(data, 'formattedClaimantContactAddress'))
  );
}

function firstDefendantParty(data: UnknownRecord): UnknownRecord | undefined {
  const defendants = defendantParties(data);
  return defendants[0];
}

function additionalDefendantParties(data: UnknownRecord): UnknownRecord[] {
  const defendantItems = collectionItems(getValue(data, 'allDefendants'));
  if (defendantItems.length > 0) {
    const currentDefendantId = getString(data, 'possessionClaimResponse.currentDefendantPartyId');
    const currentDefendant = asRecord(getValue(data, 'possessionClaimResponse.claimantEnteredDefendantDetails'));
    return defendantItems.slice(1).map(item => mergeCurrentParty(item, currentDefendantId, currentDefendant));
  }

  return collectionRecords(getValue(data, 'additionalDefendants'));
}

function defendantParties(data: UnknownRecord): UnknownRecord[] {
  const defendantItems = collectionItems(getValue(data, 'allDefendants'));
  if (defendantItems.length > 0) {
    const currentDefendantId = getString(data, 'possessionClaimResponse.currentDefendantPartyId');
    const currentDefendant = asRecord(getValue(data, 'possessionClaimResponse.claimantEnteredDefendantDetails'));
    return defendantItems.map(item => mergeCurrentParty(item, currentDefendantId, currentDefendant));
  }

  return [
    asRecord(getValue(data, 'defendant1')),
    asRecord(getValue(data, 'possessionClaimResponse.claimantEnteredDefendantDetails')),
  ].filter((party): party is UnknownRecord => !!party);
}

function mergeCurrentParty(
  partyItem: CollectionRecord,
  currentDefendantId: string | undefined,
  currentDefendant: UnknownRecord | undefined
): UnknownRecord {
  if (!currentDefendantId || partyItem.id !== currentDefendantId || !currentDefendant) {
    return partyItem.value;
  }

  return removeEmptyValues({
    ...partyItem.value,
    ...currentDefendant,
  });
}

function firstUnderlesseeParty(data: UnknownRecord): UnknownRecord | undefined {
  const parties = underlesseeParties(data);
  return parties[0];
}

function additionalUnderlesseeParties(data: UnknownRecord): UnknownRecord[] {
  const parties = collectionRecords(getValue(data, 'allUnderlesseeOrMortgagees'));
  if (parties.length > 0) {
    return parties.slice(1);
  }

  return collectionRecords(getValue(data, 'additionalUnderlesseeOrMortgagee'));
}

function underlesseeParties(data: UnknownRecord): UnknownRecord[] {
  const parties = collectionRecords(getValue(data, 'allUnderlesseeOrMortgagees'));
  if (parties.length > 0) {
    return parties;
  }

  return [asRecord(getValue(data, 'underlesseeOrMortgagee1'))].filter((party): party is UnknownRecord => !!party);
}

function partyName(party: UnknownRecord | undefined): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.nameKnown) === 'NO') {
    return PERSONS_UNKNOWN;
  }

  return (
    [getStringFromValue(party.firstName), getStringFromValue(party.lastName)].filter(Boolean).join(' ') ||
    getStringFromValue(party.orgName)
  );
}

function underlesseeName(party: UnknownRecord | undefined): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.nameKnown) === 'NO') {
    return PERSONS_UNKNOWN;
  }

  return getStringFromValue(party.name) ?? partyName(party);
}

function partyAddressHtml(party: UnknownRecord | undefined, propertyAddress: unknown): string | undefined {
  if (!party) {
    return undefined;
  }

  if (
    normaliseYesNo(party.addressKnown) === 'NO' ||
    normaliseYesNo(party.addressSameAsPossession) === 'YES' ||
    normaliseYesNo(party.addressSameAsProperty) === 'YES'
  ) {
    return addressHtml(propertyAddress);
  }

  return addressHtml(party.correspondenceAddress) ?? addressHtml(party.address);
}

function groundLabels(data: UnknownRecord): string[] {
  const summaryLabels = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .map(value => getStringFromValue(value?.label) ?? enumText(value?.code, GROUND_LABELS))
    .filter((value): value is string => !!value);

  if (summaryLabels.length > 0) {
    return unique(summaryLabels);
  }

  const labels = GROUND_COLLECTION_PATHS.flatMap(path =>
    getArray(getValue(data, path)).map(value => enumText(value, GROUND_LABELS))
  ).filter((value): value is string => !!value);

  return unique(labels);
}

function groundReasonRows(data: UnknownRecord): (ViewTheClaimSummaryRow | undefined)[] {
  const summaryRows = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .filter((value): value is UnknownRecord => !!value)
    .map(value =>
      textRow(
        `Reason for claiming possession under ground ${getStringFromValue(value.label) ?? enumText(value.code, GROUND_LABELS) ?? ''}`.trim(),
        getStringFromValue(value.reason)
      )
    )
    .filter((row): row is ViewTheClaimSummaryRow => !!row);

  if (summaryRows.length > 0) {
    return summaryRows;
  }

  return REASON_FIELDS.map(({ path, label }) =>
    textRow(`Reason for claiming possession under ground ${label}`, getString(data, path))
  );
}

function otherGroundDescriptions(data: UnknownRecord): string[] {
  const summaryDescriptions = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .filter((value): value is UnknownRecord => !!value)
    .filter(value => {
      const code = getStringFromValue(value.code)?.toUpperCase() ?? '';
      const label = getStringFromValue(value.label)?.toUpperCase() ?? '';
      return code.includes('OTHER') || label.includes('OTHER');
    })
    .map(value => getStringFromValue(value.description))
    .filter((value): value is string => !!value);

  const fallbackDescription = getFirstString(data, [
    'otherGroundsDescription',
    'introGrounds_DescriptionOfOtherGrounds',
  ]);

  return unique([...summaryDescriptions, ...(fallbackDescription ? [fallbackDescription] : [])]);
}

function selectedAlternative(data: UnknownRecord, value: string): string | undefined {
  const alternatives = getArray(getValue(data, 'alternativesToPossession')).map(item =>
    String(item).trim().toUpperCase()
  );
  return alternatives.length > 0 ? (alternatives.includes(value) ? 'Yes' : 'No') : undefined;
}

function documentLinksHtml(
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  options: { documentTypes?: string[]; categoryIds?: string[]; filenameIncludes?: string[] }
): string | undefined {
  const documentTypes = new Set(options.documentTypes ?? []);
  const categoryIds = new Set(options.categoryIds ?? []);
  const filenameIncludes = (options.filenameIncludes ?? []).map(value => value.toLowerCase());

  const links = documents.filter(document => {
    const filename = document.filename.toLowerCase();
    return (
      (documentTypes.size > 0 && !!document.documentType && documentTypes.has(document.documentType)) ||
      (categoryIds.size > 0 && !!document.categoryId && categoryIds.has(document.categoryId)) ||
      (filenameIncludes.length > 0 && filenameIncludes.some(part => filename.includes(part)))
    );
  });

  return links.length > 0
    ? links
        .map(document => linkHtml(document.filename, `/case/${caseReference}/view-documents/${document.id}`))
        .join('<br>')
    : undefined;
}

function linkHtml(text: string, href: string): string {
  return `<a class="govuk-link" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`;
}

function listHtml(values: string[]): string | undefined {
  return values.length > 0 ? values.map(value => escapeHTML(value)).join('<br>') : undefined;
}

function addressHtml(value: unknown, options: { includeCountry?: boolean } = {}): string | undefined {
  const lines = addressLines(value, options);
  return lines.length > 0 ? lines.map(line => escapeHTML(line)).join('<br>') : undefined;
}

function addressText(value: unknown, options: { includeCountry?: boolean } = {}): string | undefined {
  const lines = addressLines(value, options);
  return lines.length > 0 ? lines.join(', ') : undefined;
}

function addressLines(value: unknown, { includeCountry = false }: { includeCountry?: boolean } = {}): string[] {
  const address = asRecord(value);
  if (!address) {
    return [];
  }

  const keys: (keyof CcdCaseAddress)[] = [
    'AddressLine1',
    'AddressLine2',
    'AddressLine3',
    'PostTown',
    'County',
    'PostCode',
  ];
  if (includeCountry) {
    keys.push('Country');
  }

  return keys.map(key => getStringFromValue(address[key])).filter((line): line is string => !!line);
}

function formattedAddressHtml(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const lines = value
    .split(/<br\s*\/?>/i)
    .map(line => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.map(line => escapeHTML(line)).join('<br>') : undefined;
}

function collectionAddressesHtml(parties: UnknownRecord[]): string | undefined {
  const addresses = parties.map(party => addressHtml(party.address)).filter((value): value is string => !!value);

  return addresses.length > 0 ? addresses.join('<br><br>') : undefined;
}

function noticeDateTimeValue(data: UnknownRecord): unknown {
  return getFirstValue(data, [
    'notice_NoticePostedDate',
    'notice_NoticeDeliveredDate',
    'notice_NoticeHandedOverDateTime',
    'notice_NoticeEmailSentDateTime',
    'notice_NoticeOtherElectronicDateTime',
    'notice_NoticeOtherDateTime',
  ]);
}

function formatDate(value: unknown): string | undefined {
  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  const date = DateTime.fromISO(text, { zone: 'utc' });
  return date.isValid ? date.setZone('Europe/London').setLocale('en-gb').toFormat('d LLLL y') : text;
}

function formatTime(value: unknown): string | undefined {
  const text = getStringFromValue(value);
  if (!text || !text.includes('T')) {
    return undefined;
  }

  const date = DateTime.fromISO(text, { zone: 'utc' });
  return date.isValid ? date.setZone('Europe/London').setLocale('en-gb').toFormat('HH:mm') : undefined;
}

function formatMoney(value: unknown): string | undefined {
  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  const amount = Number(text);
  if (!Number.isFinite(amount)) {
    return text;
  }

  const pounds = text.includes('.') ? amount : amount / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pounds);
}

function yesNoText(value: unknown): string | undefined {
  const normalised = normaliseYesNo(value);
  return normalised ? (YES_NO_LABELS[normalised] ?? enumToSentence(normalised)) : undefined;
}

function normaliseYesNo(value: unknown): string | undefined {
  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  return text.toUpperCase().replace(/-/g, '_');
}

function enumText(value: unknown, labels: Record<string, string>): string | undefined {
  const dynamicLabel = dynamicListLabel(value);
  if (dynamicLabel) {
    return dynamicLabel;
  }

  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  const key = text.toUpperCase();
  return labels[key] ?? enumToSentence(text);
}

function dynamicListLabel(value: unknown): string | undefined {
  const record = asRecord(value);
  const nestedValue = asRecord(record?.value);
  return (
    getStringFromValue(nestedValue?.label) ?? getStringFromValue(record?.label) ?? getStringFromValue(record?.valueCode)
  );
}

function enumToSentence(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, char => char.toUpperCase());
}

function getFirstString(data: UnknownRecord, paths: string[]): string | undefined {
  return paths.map(path => getString(data, path)).find(Boolean);
}

function getString(data: UnknownRecord, path: string): string | undefined {
  return getStringFromValue(getValue(data, path));
}

function getFirstValue(data: UnknownRecord, paths: string[]): unknown {
  return paths.map(path => getValue(data, path)).find(hasCapturedValue);
}

function getValue(data: UnknownRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    const record = asRecord(current);
    return record ? record[segment] : undefined;
  }, data);
}

function hasCapturedValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

function getStringFromValue(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text = String(value).trim();
  return text || undefined;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : undefined;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function collectionRecords(value: unknown): UnknownRecord[] {
  return collectionItems(value).map(item => item.value);
}

function collectionItems(value: unknown): CollectionRecord[] {
  return getArray(value).flatMap(item => {
    const record = asRecord(item);
    const recordValue = asRecord(record?.value);
    if (!recordValue) {
      return [];
    }

    return [
      {
        id: getStringFromValue(record?.id),
        value: recordValue,
      },
    ];
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function partyNames(parties: UnknownRecord[]): string[] {
  return parties.map(party => partyName(party)).filter((name): name is string => !!name);
}

function listText(values: string[]): string | undefined {
  return values.length > 0 ? values.join(', ') : undefined;
}

function removeEmptyValues(value: UnknownRecord): UnknownRecord {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => hasCapturedValue(item)));
}
