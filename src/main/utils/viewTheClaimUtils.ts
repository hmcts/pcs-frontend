import escapeHTML from 'escape-html';
import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

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

export interface ViewTheClaimStatementOfTruth {
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
  statementOfTruth: ViewTheClaimStatementOfTruth;
  documentsUrl: string;
}

type UnknownRecord = Record<string, unknown>;

interface CollectionRecord {
  id?: string;
  value: UnknownRecord;
}

interface ViewTheClaimCopy {
  section: (key: string, options?: Record<string, unknown>) => string;
  label: (key: string, options?: Record<string, unknown>) => string;
  text: (key: string, options?: Record<string, unknown>) => string;
  personsUnknown: string;
}

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
  { path: 'absoluteGrounds', label: 'absoluteGrounds' },
  { path: 'antiSocialBehaviourGround', label: 'antiSocialBehaviourGround' },
  { path: 'antiSocialGround', label: 'antiSocialGround' },
  { path: 'breachOfTheTenancyGround', label: 'breachOfTheTenancyGround' },
  { path: 'breachOfTenancyGround', label: 'breachOfTenancyGround' },
  { path: 'breachOfTenancyConditionsReason', label: 'breachOfTenancyConditionsReason' },
  { path: 'domesticViolenceGround', label: 'domesticViolenceGround' },
  { path: 'domesticViolenceReason', label: 'domesticViolenceReason' },
  { path: 'ownerOccupierReason', label: 'ownerOccupierReason' },
  { path: 'studentLetReason', label: 'studentLetReason' },
  { path: 'suitableAltAccommodationReason', label: 'suitableAltAccommodationReason' },
  { path: 'assuredNoArrearsReasons_AntisocialBehaviour', label: 'assuredNoArrearsReasonsAntisocialBehaviour' },
  {
    path: 'assuredNoArrearsReasons_BreachOfTenancyConditions',
    label: 'assuredNoArrearsReasonsBreachOfTenancyConditions',
  },
  { path: 'assuredNoArrearsReasons_DeathOfTenant', label: 'assuredNoArrearsReasonsDeathOfTenant' },
  { path: 'assuredNoArrearsReasons_DomesticViolence', label: 'assuredNoArrearsReasonsDomesticViolence' },
  { path: 'assuredNoArrearsReasons_FalseStatement', label: 'assuredNoArrearsReasonsFalseStatement' },
  { path: 'assuredNoArrearsReasons_FurnitureDeterioration', label: 'assuredNoArrearsReasonsFurnitureDeterioration' },
  { path: 'assuredNoArrearsReasons_HolidayLet', label: 'assuredNoArrearsReasonsHolidayLet' },
  { path: 'assuredNoArrearsReasons_LandlordEmployee', label: 'assuredNoArrearsReasonsLandlordEmployee' },
  {
    path: 'assuredNoArrearsReasons_MinisterOfReligion',
    label: 'assuredNoArrearsReasonsMinisterOfReligion',
  },
  { path: 'assuredNoArrearsReasons_NoRightToRent', label: 'assuredNoArrearsReasonsNoRightToRent' },
  {
    path: 'assuredNoArrearsReasons_NuisanceOrIllegalUse',
    label: 'assuredNoArrearsReasonsNuisanceOrIllegalUse',
  },
  { path: 'assuredNoArrearsReasons_OffenceDuringRiot', label: 'assuredNoArrearsReasonsOffenceDuringRiot' },
  { path: 'assuredNoArrearsReasons_OwnerOccupier', label: 'assuredNoArrearsReasonsOwnerOccupier' },
  {
    path: 'assuredNoArrearsReasons_PropertyDeterioration',
    label: 'assuredNoArrearsReasonsPropertyDeterioration',
  },
  { path: 'assuredNoArrearsReasons_Redevelopment', label: 'assuredNoArrearsReasonsRedevelopment' },
  {
    path: 'assuredNoArrearsReasons_RepossessionByLender',
    label: 'assuredNoArrearsReasonsRepossessionByLender',
  },
  { path: 'assuredNoArrearsReasons_StudentLet', label: 'assuredNoArrearsReasonsStudentLet' },
  {
    path: 'assuredNoArrearsReasons_SuitableAlternativeAccomodation',
    label: 'assuredNoArrearsReasonsSuitableAlternativeAccomodation',
  },
  {
    path: 'walesFailToGiveUpS170Reason',
    label: 'walesFailToGiveUpS170Reason',
  },
  {
    path: 'walesFailToGiveUpBreakNoticeS191Reason',
    label: 'walesFailToGiveUpBreakNoticeS191Reason',
  },
  {
    path: 'walesLandlordNoticeFtEndS186Reason',
    label: 'walesLandlordNoticeFtEndS186Reason',
  },
  { path: 'walesLandlordBreakClauseS199Reason', label: 'walesLandlordBreakClauseS199Reason' },
  { path: 'walesOtherBreachSection157Reason', label: 'walesOtherBreachSection157Reason' },
  {
    path: 'walesSecureFailureToGiveUpPossessionSection170Reason',
    label: 'walesSecureFailureToGiveUpPossessionSection170Reason',
  },
  {
    path: 'walesSecureFailureToGiveUpPossessionSection191Reason',
    label: 'walesSecureFailureToGiveUpPossessionSection191Reason',
  },
  {
    path: 'walesSecureLandlordNoticeSection186Reason',
    label: 'walesSecureLandlordNoticeSection186Reason',
  },
  {
    path: 'walesSecureLandlordNoticeSection199Reason',
    label: 'walesSecureLandlordNoticeSection199Reason',
  },
  { path: 'walesSecureOtherBreachOfContractReason', label: 'walesSecureOtherBreachOfContractReason' },
];

export function buildViewTheClaimPageData(
  caseReference: string,
  caseData: CcdCaseData,
  t: TFunction
): ViewTheClaimPageData {
  const copy = createViewTheClaimCopy(t);
  const data = caseData as UnknownRecord;
  const documents = extractCaseDocuments(data);
  const propertyAddress = data.propertyAddress;
  const propertyAddressHtml = addressHtml(propertyAddress);
  const propertyAddressText = addressText(propertyAddress);
  const claimant = claimantName(data, copy);
  const emptyValue = t('viewTheClaim:emptyValue');
  const claimIssueDateText =
    formatDate(getValue(data, 'claimIssueDate')) ?? getFirstString(data, ['detailsTab_DateClaimIssued']);
  const claimSubmittedDateText =
    getFirstString(data, ['detailsTab_DateClaimSubmitted']) ??
    formatDate(getFirstValue(data, ['submittedOn', 'dateSubmitted', 'claimSubmittedDate']));
  const pageMetadataRows = sectionRows([
    summaryRow(t('viewTheClaim:dateIssued'), { text: claimIssueDateText ?? emptyValue }),
    summaryRow(t('viewTheClaim:dateSubmitted'), { text: claimSubmittedDateText ?? emptyValue }),
  ]);

  const sections = [
    buildClaimantSection(data, copy),
    buildDefendantSection(data, propertyAddress, copy),
    ...buildAdditionalDefendantSections(data, propertyAddress, copy),
    buildUnderlesseeTriageSection(data, copy),
    buildUnderlesseeSection(data, propertyAddress, copy),
    ...buildAdditionalUnderlesseeSections(data, propertyAddress, copy),
    buildClaimDetailsSection(data, propertyAddress, copy),
    buildWelshAsbSection(data, copy),
    buildRentArrearsSection(data, documents, caseReference, copy),
    buildActionTakenSection(data, copy),
    buildNoticeDetailsSection(data, documents, caseReference, copy),
    buildTenancySection(data, documents, caseReference, copy),
    buildClaimantCircumstancesSection(data, copy),
    buildDefendantCircumstancesSection(data, copy),
    buildDemotionSection(data, copy),
    buildSuspensionSection(data, copy),
    buildProhibitedConductSection(data, copy),
    buildRequiredDocumentsSection(data, documents, caseReference, copy),
  ].filter((item): item is ViewTheClaimSection => !!item && item.rows.length > 0);

  return {
    caseReference,
    propertyAddressHtml,
    propertyAddressText,
    introText: claimant
      ? t('viewTheClaim:introText', {
          claimantName: claimant,
        })
      : t('viewTheClaim:introTextFallback'),
    pageMetadataRows,
    claimPdfSection: buildClaimPdfSection(documents, caseReference, copy),
    sections,
    statementOfTruth: buildStatementOfTruthSection(data, copy, emptyValue),
    documentsUrl: `/case/${caseReference}/view-documents`,
  };
}

function buildClaimPdfSection(
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimDownloadSection {
  const claimDocument = documents.find(
    document => document.categoryId === 'statementsOfCase' || document.filename.toLowerCase().includes('claim')
  );

  return {
    title: copy.text('claimPdfSectionTitle'),
    rows: [
      summaryRow(
        copy.text('claimPdfLabel'),
        claimDocument
          ? { html: linkHtml(copy.text('claimPdfLabel'), `/case/${caseReference}/view-documents/${claimDocument.id}`) }
          : { text: copy.text('claimPdfLabel') }
      ),
    ],
  };
}

function buildClaimantSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows: (ViewTheClaimSummaryRow | undefined)[] = [
    textRow(copy.label('claimantName'), claimantName(data, copy)),
    htmlRow(copy.label('addressForService'), claimantAddressHtml(data)),
  ];

  if (isWalesCase(data)) {
    rows.push(textRow(copy.label('isExemptLandlord'), yesNoText(getValue(data, 'isExemptLandlord'))));
  }

  return section(copy.section('claimantDetails'), rows);
}

function buildDefendantSection(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const defendant = firstDefendantParty(data);

  const rows = [
    textRow(copy.label('defendantName'), partyName(defendant, copy)),
    htmlRow(copy.label('addressForService'), partyAddressHtml(defendant, propertyAddress)),
  ];

  return section(copy.section('defendantDetails'), rows);
}

function buildAdditionalDefendantSections(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection[] {
  const defendants = additionalDefendantParties(data);

  return defendants
    .map((defendant, index) =>
      section(copy.section('additionalDefendantDetails', { number: index + 1 }), [
        textRow(copy.label('defendantName'), partyName(defendant, copy)),
        htmlRow(copy.label('addressForService'), partyAddressHtml(defendant, propertyAddress)),
      ])
    )
    .filter((sectionItem): sectionItem is ViewTheClaimSection => !!sectionItem);
}

function buildClaimDetailsSection(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    htmlRow(copy.label('propertyAddress'), addressHtml(propertyAddress)),
    textRow(
      copy.label('hasGrounds'),
      yesNoText(getFirstValue(data, ['introGrounds_HasIntroductoryDemotedOtherGroundsForPossession']))
    ),
    htmlRow(copy.label('groundsForPossession'), listHtml(groundLabels(data))),
    htmlRow(copy.label('descriptionOfGrounds'), listHtml(otherGroundDescriptions(data))),
    ...groundReasonRows(data, copy),
    textRow(copy.label('whyClaimingPossession'), getFirstString(data, ['noGrounds', 'absoluteGrounds'])),
    textRow(
      copy.label('otherInfoAboutReasons'),
      yesNoText(getValue(data, 'additionalReasonsForPossession.hasReasons'))
    ),
    textRow(copy.label('additionalReasons'), getString(data, 'additionalReasonsForPossession.reasons')),
  ];

  return section(copy.section('claimDetails'), rows);
}

function buildWelshAsbSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  if (!isWalesCase(data)) {
    return undefined;
  }

  const rows = [
    textRow(copy.label('isASB'), yesNoText(getValue(data, 'walesAntisocialBehaviour'))),
    textRow(copy.label('asbDetails'), getString(data, 'walesAntisocialBehaviourDetails')),
    textRow(copy.label('isIllegalPurposes'), yesNoText(getValue(data, 'walesIllegalPurposesUse'))),
    textRow(copy.label('illegalPurposesDetails'), getString(data, 'walesIllegalPurposesUseDetails')),
    textRow(copy.label('isOtherProhibitedConduct'), yesNoText(getValue(data, 'walesOtherProhibitedConduct'))),
    textRow(copy.label('otherProhibitedConductDetails'), getString(data, 'walesOtherProhibitedConductDetails')),
  ];

  return section(copy.section('asb'), rows);
}

function buildRentArrearsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  if (!isRentArrearsClaim(data)) {
    return undefined;
  }

  const rows = [
    textRow(copy.label('rentAmount'), formatMoney(getValue(data, 'rentDetails_CurrentRent'))),
    textRow(copy.label('howIsRentCalculated'), enumText(getValue(data, 'rentDetails_Frequency'), FREQUENCY_LABELS)),
    textRow(copy.label('totalRentArrears'), formatMoney(getValue(data, 'rentArrears_Total'))),
    textRow(copy.label('previousSteps'), yesNoText(getValue(data, 'rentArrears_RecoveryAttempted'))),
    textRow(copy.label('previousStepsDetails'), getString(data, 'rentArrears_RecoveryAttemptDetails')),
    textRow(copy.label('judgmentRequested'), yesNoText(getValue(data, 'arrearsJudgmentWanted'))),
    htmlRow(
      copy.label('rentStatement'),
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['RENT_STATEMENT'],
      })
    ),
  ];

  return section(copy.section('rentArrears'), rows);
}

function buildActionTakenSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('preActionProtocol'), yesNoText(getValue(data, 'preActionProtocolCompleted'))),
    textRow(
      copy.label('preActionProtocolReason'),
      getFirstString(data, [
        'preActionProtocolIncompleteExplanation',
        'preActionProtocolNotCompletedReason',
        'preActionProtocolReason',
      ])
    ),
    textRow(copy.label('mediationAttempted'), yesNoText(getValue(data, 'mediationAttempted'))),
    textRow(copy.label('settlementAttempted'), yesNoText(getValue(data, 'settlementAttempted'))),
    textRow(copy.label('noticeServed'), yesNoText(getFirstValue(data, ['noticeServed', 'walesNoticeServed']))),
    textRow(
      copy.label('noticeNotServedReason'),
      getFirstString(data, [
        'notice_NoticeNotServedReason',
        'notice_NoNoticeStatement',
        'walesNoticeStatement',
        'noticeStatement',
      ])
    ),
  ];

  return section(copy.section('actionTaken'), rows);
}

function buildNoticeDetailsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const noticeDateTime = noticeDateTimeValue(data);
  const rows = [
    textRow(copy.label('noticeType'), getString(data, 'walesTypeOfNoticeServed')),
    textRow(
      copy.label('noticeServiceMethod'),
      enumText(getValue(data, 'notice_NoticeServiceMethod'), NOTICE_SERVICE_METHOD_LABELS)
    ),
    textRow(copy.label('noticeDate'), formatDate(noticeDateTime)),
    textRow(copy.label('noticeTime'), formatTime(noticeDateTime)),
    textRow(copy.label('noticePersonName'), getString(data, 'notice_NoticePersonName')),
    textRow(copy.label('noticeEmailAddress'), getString(data, 'notice_NoticeEmailAddress')),
    textRow(copy.label('noticeOtherElectronic'), getString(data, 'notice_NoticeOtherElectronicMethodExplanation')),
    textRow(copy.label('noticeOtherMeans'), getString(data, 'notice_NoticeOtherExplanation')),
    textRow(
      copy.label('canUploadNotice'),
      yesNoText(getFirstValue(data, ['notice_CanUploadNotice', 'notice_HasNoticeDocuments']))
    ),
    textRow(
      copy.label('cannotUploadNoticeReason'),
      getFirstString(data, ['notice_UnableToUploadNoticeReason', 'notice_NoNoticeDocumentsReason'])
    ),
    htmlRow(
      copy.label('noticeDocument'),
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['NOTICE_FOR_SERVICE_OUT_OF_JURISDICTION', 'NOTICE', 'CERTIFICATE_OF_SERVICE'],
      })
    ),
  ];

  return section(copy.section('noticeDetails'), rows);
}

function buildTenancySection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const walesCase = isWalesCase(data);
  const rows: (ViewTheClaimSummaryRow | undefined)[] = [
    textRow(
      copy.label('tenancyType'),
      enumText(getFirstValue(data, ['tenancy_TypeOfTenancyLicence', 'occupationLicenceTypeWales']), TENANCY_TYPE_LABELS)
    ),
    textRow(
      copy.label('tenancyStartDate'),
      formatDate(getFirstValue(data, ['tenancy_TenancyLicenceDate', 'licenceStartDate']))
    ),
  ];

  if (walesCase) {
    rows.push(textRow(copy.label('tenancyWalesUpload'), yesNoText(hasLicenceDocuments(data) ? 'YES' : 'NO')));
  } else {
    rows.push(
      textRow(copy.label('tenancyCopy'), yesNoText(getValue(data, 'tenancy_HasCopyOfTenancyLicence'))),
      textRow(copy.label('tenancyNoCopyReason'), getString(data, 'tenancy_ReasonsForNoTenancyLicenceDocuments'))
    );
  }

  rows.push(
    htmlRow(
      copy.label('tenancyDocument'),
      documentLinksHtml(documents, caseReference, {
        sourceFields: walesCase ? ['licenceDocuments'] : undefined,
        filenameIncludes: ['tenancy', 'licence', 'license', 'occupation'],
      })
    )
  );

  return section(copy.section('tenancyDetails'), rows);
}

function buildClaimantCircumstancesSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('claimantCircumstancesQuestion'), yesNoText(getValue(data, 'claimantCircumstancesSelect'))),
    textRow(copy.label('claimantCircumstancesDetails'), getString(data, 'claimantCircumstancesDetails')),
  ];

  return section(copy.section('claimantCircumstances'), rows);
}

function buildDefendantCircumstancesSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('defendantCircumstancesQuestion'), yesNoText(getValue(data, 'hasDefendantCircumstancesInfo'))),
    textRow(copy.label('defendantCircumstancesDetails'), getString(data, 'defendantCircumstancesInfo')),
  ];

  return section(copy.section('defendantCircumstances'), rows);
}

function buildUnderlesseeTriageSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  return section(copy.section('underlesseeTriage'), [
    textRow(copy.label('hasUnderlesseeOrMortgagee'), yesNoText(getValue(data, 'hasUnderlesseeOrMortgagee'))),
  ]);
}

function buildUnderlesseeSection(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const party = firstUnderlesseeParty(data);

  return section(copy.section('underlesseeDetails'), [
    textRow(copy.label('underlesseeName'), underlesseeName(party, copy)),
    htmlRow(copy.label('underlesseeAddress'), partyAddressHtml(party, propertyAddress)),
  ]);
}

function buildAdditionalUnderlesseeSections(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection[] {
  const parties = additionalUnderlesseeParties(data);

  return parties
    .map((party, index) =>
      section(copy.section('additionalUnderlesseeDetails', { number: index + 1 }), [
        textRow(copy.label('underlesseeName'), underlesseeName(party, copy)),
        htmlRow(copy.label('underlesseeAddress'), partyAddressHtml(party, propertyAddress)),
      ])
    )
    .filter((sectionItem): sectionItem is ViewTheClaimSection => !!sectionItem);
}

function buildDemotionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('demotionQuestion'), selectedAlternative(data, 'DEMOTION_OF_TENANCY')),
    textRow(
      copy.label('demotionHousingAct'),
      enumText(getFirstValue(data, ['demotionOfTenancy_HousingAct', 'demotionOfTenancyActs']), {
        SECTION_6A_2: 'Section 6A(2) of the Housing Act 1988',
        SECTION_82A_2: 'Section 82A(2) of the Housing Act 1985',
      })
    ),
    textRow(
      copy.label('demotionStatement'),
      yesNoText(getValue(data, 'demotionOfTenancy_StatementOfExpressTermsServed'))
    ),
    textRow(copy.label('demotionDetails'), getString(data, 'demotionOfTenancy_StatementOfExpressTermsDetails')),
    textRow(copy.label('demotionReason'), getFirstString(data, ['demotionOfTenancy_Reason', 'demotionOrderReason'])),
  ];

  return section(copy.section('demotion'), rows);
}

function buildSuspensionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('suspensionQuestion'), selectedAlternative(data, 'SUSPENSION_OF_RIGHT_TO_BUY')),
    textRow(
      copy.label('suspensionHousingAct'),
      enumText(getFirstValue(data, ['suspensionOfRTB_HousingAct', 'suspensionOfRightToBuyActs']), {
        SECTION_121A: 'Section 121A of the Housing Act 1985',
        SECTION_6A_2: 'Section 6A(2) of the Housing Act 1988',
        SECTION_82A_2: 'Section 82A(2) of the Housing Act 1985',
      })
    ),
    textRow(copy.label('suspensionReason'), getFirstString(data, ['suspensionOfRTB_Reason', 'suspensionOrderReason'])),
  ];

  return section(copy.section('suspension'), rows);
}

function buildProhibitedConductSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('prohibitedConductQuestion'), yesNoText(getValue(data, 'prohibitedConductWalesClaim'))),
    textRow(copy.label('prohibitedConductAgreement'), yesNoText(getValue(data, 'agreedTermsOfPeriodicContract'))),
    textRow(copy.label('prohibitedConductDetails'), getString(data, 'detailsOfTerms')),
    textRow(copy.label('prohibitedConductReason'), getString(data, 'prohibitedConductWalesClaimDetails')),
  ];

  return section(copy.section('prohibitedConduct'), rows);
}

function buildRequiredDocumentsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('epcQuestion'), yesNoText(getValue(data, 'energyPerformanceCertificateProvided'))),
    textRow(copy.label('epcReason'), getString(data, 'noEnergyPerformanceCertificateReason')),
    htmlRow(
      copy.label('epcDocument'),
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['ENERGY_PERFORMANCE_CERTIFICATE'],
      })
    ),
    textRow(copy.label('gasQuestion'), yesNoText(getValue(data, 'gasSafetyReportProvided'))),
    textRow(copy.label('gasReason'), getString(data, 'noGasSafetyReportReason')),
    htmlRow(
      copy.label('gasDocument'),
      documentLinksHtml(documents, caseReference, { documentTypes: ['GAS_SAFETY_REPORT'] })
    ),
    textRow(copy.label('eicrQuestion'), yesNoText(getValue(data, 'electricalInstallationConditionProvided'))),
    textRow(copy.label('eicrReason'), getString(data, 'noElectricalInstallationConditionReason')),
    htmlRow(
      copy.label('eicrDocument'),
      documentLinksHtml(documents, caseReference, {
        documentTypes: ['ELECTRICAL_INSTALLATION_CONDITION_REPORT'],
      })
    ),
  ];

  return section(copy.section('requiredDocuments'), rows);
}

function buildStatementOfTruthSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy,
  emptyValue: string
): ViewTheClaimStatementOfTruth {
  const statementOfTruth = asRecord(getValue(data, 'statementOfTruth'));
  let name: string | undefined;
  let position: string | undefined;

  if (statementOfTruth) {
    const completedBy = getStringFromValue(statementOfTruth.completedBy)?.toUpperCase();

    if (completedBy === 'LEGAL_REPRESENTATIVE') {
      name = getFirstString(statementOfTruth, ['fullNameLegalRep']);
      position = getFirstString(statementOfTruth, ['positionLegalRep']);
    } else {
      name = getFirstString(statementOfTruth, ['fullNameParty', 'fullNameClaimant']);
      position = getFirstString(statementOfTruth, ['positionParty', 'positionClaimant']);
    }
  }

  const valueLines =
    name || position
      ? [name ?? emptyValue, position ?? emptyValue]
      : [emptyValue, emptyValue];

  return {
    rows: sectionRows([
      summaryRow(copy.label('statementOfTruthCompletedBy'), {
        html: valueLines.map(line => escapeHTML(line)).join('<br>'),
      }),
    ]),
  };
}

function createViewTheClaimCopy(t: TFunction): ViewTheClaimCopy {
  return {
    section: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:sections.${key}`, options),
    label: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:labels.${key}`, options),
    text: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:${key}`, options),
    personsUnknown: t('viewTheClaim:personsUnknown'),
  };
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

function claimantName(data: UnknownRecord, copy: ViewTheClaimCopy): string | undefined {
  if (normaliseYesNo(getValue(data, 'isClaimantNameCorrect')) === 'NO') {
    return getFirstString(data, ['overriddenClaimantName', 'fallbackClaimantName', 'claimantName']);
  }

  return (
    listText(partyNames(collectionRecords(getValue(data, 'allClaimants')), copy)) ??
    getFirstString(data, [
      'claimantName',
      'fallbackClaimantName',
      'detailsTab_ClaimantInformation.claimantName',
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
    formattedAddressHtml(getString(data, 'formattedClaimantContactAddress')) ??
    addressHtml(getValue(data, 'detailsTab_ClaimantAddress'), { includeCountry: true })
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

function partyName(party: UnknownRecord | undefined, copy: ViewTheClaimCopy): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.nameKnown) === 'NO') {
    return copy.personsUnknown;
  }

  return (
    [getStringFromValue(party.firstName), getStringFromValue(party.lastName)].filter(Boolean).join(' ') ||
    getStringFromValue(party.orgName)
  );
}

function underlesseeName(party: UnknownRecord | undefined, copy: ViewTheClaimCopy): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.nameKnown) === 'NO') {
    return copy.personsUnknown;
  }

  return getStringFromValue(party.name) ?? partyName(party, copy);
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

function groundReasonRows(data: UnknownRecord, copy: ViewTheClaimCopy): (ViewTheClaimSummaryRow | undefined)[] {
  const summaryRows = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .filter((value): value is UnknownRecord => !!value)
    .map(value =>
      textRow(
        copy.label('reasonForGround', {
          ground: getStringFromValue(value.label) ?? enumText(value.code, GROUND_LABELS) ?? '',
        }),
        getStringFromValue(value.reason)
      )
    )
    .filter((row): row is ViewTheClaimSummaryRow => !!row);

  if (summaryRows.length > 0) {
    return summaryRows;
  }

  return REASON_FIELDS.map(({ path, label }) =>
    textRow(copy.label('reasonForGround', { ground: copy.label(label) }), getString(data, path))
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

function isWalesCase(data: UnknownRecord): boolean {
  const country = getStringFromValue(getValue(data, 'legislativeCountry'))?.toUpperCase();
  return country === 'WALES' || !!getValue(data, 'occupationLicenceTypeWales');
}

function isRentArrearsClaim(data: UnknownRecord): boolean {
  return normaliseYesNo(getValue(data, 'claimDueToRentArrears')) === 'YES';
}

function hasLicenceDocuments(data: UnknownRecord): boolean {
  const licenceDocuments = getValue(data, 'licenceDocuments');
  return Array.isArray(licenceDocuments) && licenceDocuments.length > 0;
}

function documentLinksHtml(
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  options: {
    documentTypes?: string[];
    categoryIds?: string[];
    filenameIncludes?: string[];
    sourceFields?: string[];
  }
): string | undefined {
  const documentTypes = new Set(options.documentTypes ?? []);
  const categoryIds = new Set(options.categoryIds ?? []);
  const sourceFields = new Set(options.sourceFields ?? []);
  const filenameIncludes = (options.filenameIncludes ?? []).map(value => value.toLowerCase());

  const links = documents.filter(document => {
    if (sourceFields.size > 0) {
      return sourceFields.has(document.sourceField);
    }

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

function partyNames(parties: UnknownRecord[], copy: ViewTheClaimCopy): string[] {
  return parties.map(party => partyName(party, copy)).filter((name): name is string => !!name);
}

function listText(values: string[]): string | undefined {
  return values.length > 0 ? values.join(', ') : undefined;
}

function removeEmptyValues(value: UnknownRecord): UnknownRecord {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => hasCapturedValue(item)));
}
