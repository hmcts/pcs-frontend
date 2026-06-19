import {
  FREQUENCY_LABELS,
  NOTICE_SERVICE_METHOD_LABELS,
  STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS,
  TENANCY_TYPE_LABELS,
} from './viewTheClaimLabels';
import {
  additionalDefendantParties,
  additionalUnderlesseeParties,
  addressHtml,
  asRecord,
  claimantAddressHtml,
  claimantName,
  documentLinksHtml,
  enumText,
  firstDefendantParty,
  firstUnderlesseeParty,
  formatDate,
  formatMoney,
  formatTime,
  getFirstString,
  getFirstValue,
  getString,
  getValue,
  groundLabels,
  groundReasonRows,
  htmlRow,
  linkHtml,
  listHtml,
  noticeDateTimeValue,
  otherGroundDescriptions,
  partyAddressHtml,
  partyName,
  section,
  selectedAlternative,
  summaryRow,
  textRow,
  underlesseeName,
  yesNoText,
} from './viewTheClaimUtils';
import type {
  UnknownRecord,
  ViewTheClaimCopy,
  ViewTheClaimDownloadSection,
  ViewTheClaimSection,
} from './viewTheClaimUtils';

import type { CaseDocumentLookupItem } from '@utils/documentUtils';

export function buildClaimPdfSection(
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

export function buildClaimantSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('claimantName'), claimantName(data, copy)),
    htmlRow(copy.label('addressForService'), claimantAddressHtml(data)),
    textRow(copy.label('isExemptLandlord'), yesNoText(getValue(data, 'isExemptLandlord'))),
  ];

  return section(copy.section('claimantDetails'), rows);
}

export function buildDefendantSection(
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

export function buildAdditionalDefendantSections(
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

export function buildClaimDetailsSection(
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

export function buildWelshAsbSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
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

export function buildRentArrearsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
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

export function buildActionTakenSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
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
  ];

  return section(copy.section('actionTaken'), rows);
}

export function buildNoticeDetailsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const noticeDateTime = noticeDateTimeValue(data);
  const rows = [
    textRow(copy.label('noticeServed'), yesNoText(getFirstValue(data, ['noticeServed', 'walesNoticeServed']))),
    textRow(
      copy.label('noticeNotServedReason'),
      getFirstString(data, [
        'notice_NoticeNotServedReason',
        'notice_NoNoticeStatement',
        'walesNoNoticeStatement',
        'noticeStatement',
      ])
    ),
    textRow(copy.label('noticeType'), getString(data, 'walesTypeOfNoticeServed')),
    textRow(
      copy.label('noticeServiceMethod'),
      enumText(getValue(data, 'notice_NoticeServiceMethod'), NOTICE_SERVICE_METHOD_LABELS)
    ),
    textRow(copy.label('noticeDate'), formatDate(noticeDateTime, copy.locale)),
    textRow(copy.label('noticeTime'), formatTime(noticeDateTime, copy.locale)),
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

export function buildTenancySection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('tenancyType'),
      enumText(getFirstValue(data, ['tenancy_TypeOfTenancyLicence', 'occupationLicenceTypeWales']), TENANCY_TYPE_LABELS)
    ),
    textRow(
      copy.label('tenancyStartDate'),
      formatDate(getFirstValue(data, ['tenancy_TenancyLicenceDate', 'licenceStartDate']), copy.locale)
    ),
    textRow(copy.label('tenancyCopy'), yesNoText(getValue(data, 'tenancy_HasCopyOfTenancyLicence'))),
    textRow(copy.label('tenancyNoCopyReason'), getString(data, 'tenancy_ReasonsForNoTenancyLicenceDocuments')),
    htmlRow(
      copy.label('tenancyDocument'),
      documentLinksHtml(documents, caseReference, {
        filenameIncludes: ['tenancy', 'licence', 'license', 'occupation'],
      })
    ),
  ];

  return section(copy.section('tenancyDetails'), rows);
}

export function buildClaimantCircumstancesSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('claimantCircumstancesQuestion'), yesNoText(getValue(data, 'claimantCircumstancesSelect'))),
    textRow(copy.label('claimantCircumstancesDetails'), getString(data, 'claimantCircumstancesDetails')),
  ];

  return section(copy.section('claimantCircumstances'), rows);
}

export function buildDefendantCircumstancesSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('defendantCircumstancesQuestion'), yesNoText(getValue(data, 'hasDefendantCircumstancesInfo'))),
    textRow(copy.label('defendantCircumstancesDetails'), getString(data, 'defendantCircumstancesInfo')),
  ];

  return section(copy.section('defendantCircumstances'), rows);
}

export function buildUnderlesseeTriageSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  return section(copy.section('underlesseeTriage'), [
    textRow(copy.label('hasUnderlesseeOrMortgagee'), yesNoText(getValue(data, 'hasUnderlesseeOrMortgagee'))),
  ]);
}

export function buildUnderlesseeSection(
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

export function buildAdditionalUnderlesseeSections(
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

export function buildDemotionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
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

export function buildSuspensionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
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

export function buildProhibitedConductSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('prohibitedConductQuestion'), yesNoText(getValue(data, 'prohibitedConductWalesClaim'))),
    textRow(copy.label('prohibitedConductAgreement'), yesNoText(getValue(data, 'agreedTermsOfPeriodicContract'))),
    textRow(copy.label('prohibitedConductDetails'), getString(data, 'detailsOfTerms')),
    textRow(copy.label('prohibitedConductReason'), getString(data, 'prohibitedConductWalesClaimDetails')),
  ];

  return section(copy.section('prohibitedConduct'), rows);
}

export function buildRequiredDocumentsSection(
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

export function buildStatementOfTruthSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const statementOfTruth = asRecord(getValue(data, 'statementOfTruth'));
  if (!statementOfTruth) {
    return undefined;
  }

  const completedBy =
    getFirstString(statementOfTruth, ['fullNameLegalRep', 'fullNameParty', 'fullNameClaimant']) ??
    enumText(statementOfTruth.completedBy, STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS);
  const firmName = getFirstString(statementOfTruth, ['firmNameLegalRep']);
  const position = getFirstString(statementOfTruth, ['positionLegalRep', 'positionParty', 'positionClaimant']);
  const rows = [
    htmlRow(copy.label('statementOfTruthCompletedBy'), [completedBy, firmName, position].filter(Boolean).join('<br>')),
  ];

  return section(copy.section('statementOfTruth'), rows);
}
