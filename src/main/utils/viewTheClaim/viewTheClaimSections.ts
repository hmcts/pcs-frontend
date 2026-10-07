import {
  HOUSING_ACT_LABELS,
  NOTICE_SERVICE_METHOD_LABELS,
  RENT_FREQUENCY_LABELS,
  STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS,
  TENANCY_TYPE_LABELS,
} from './viewTheClaimLabels';
import {
  additionalDefendantName,
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
  formatTime,
  getArray,
  getFirstPartyName,
  getFirstString,
  getFirstValue,
  getString,
  getValue,
  groundLabels,
  groundNames,
  groundReasonRows,
  htmlRow,
  linkHtml,
  listHtml,
  localisedLabel,
  noticeDateTimeValue,
  noticeDateValue,
  otherGroundDescriptions,
  partyAddressRow,
  partyName,
  section,
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
    document => document.categoryId === 'statementsOfCase' && document.filename.toLowerCase().includes('claim')
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
    textRow(
      copy.label('isExemptLandlord'),
      yesNoText(getValue(data, 'detailsTab_ClaimantRegistrationAndLicensingDetails.isExemptLandlord'), copy, 'isAre')
    ),
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
    textRow(
      copy.label('defendantName'),
      partyName(defendant, copy) ??
        getFirstPartyName(
          data,
          [
            'detailsTab_DefendantInformationDetails',
            'casePartiesTab_DefendantOneDetails',
            'summaryTab_DefendantDetails',
          ],
          copy
        )
    ),
    partyAddressRow(defendant, propertyAddress, copy.label('addressForService'), copy),
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
        textRow(copy.label('defendantName'), additionalDefendantName(defendant, data, index, copy)),
        partyAddressRow(defendant, propertyAddress, copy.label('addressForService'), copy),
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
    textRow(copy.label('hasGrounds'), groundLabels(data).length > 0 ? yesNoText('YES', copy, 'isThere') : undefined),
    htmlRow(copy.label('groundsForPossession'), listHtml(groundNames(data, copy))),
    htmlRow(copy.label('descriptionOfGrounds'), listHtml(otherGroundDescriptions(data))),
    ...groundReasonRows(data, copy),
    textRow(copy.label('whyClaimingPossession'), getFirstString(data, ['noGrounds', 'absoluteGrounds'])),
    textRow(
      copy.label('otherInfoAboutReasons'),
      yesNoText(
        getFirstValue(data, ['detailsTab_ReasonsForPossessionDetails.hasAdditionalReasons']),
        copy,
        'isThere'
      ) ??
        (getFirstString(data, ['detailsTab_ReasonsForPossessionDetails.otherGrounds'])
          ? yesNoText('YES', copy, 'isThere')
          : undefined)
    ),
    textRow(
      copy.label('additionalReasons'),
      getFirstString(data, [
        'detailsTab_ReasonsForPossessionDetails.additionalReasonsDetails',
        'summaryTab_ReasonsForPossession.additionalReasonsDetails',
      ])
    ),
  ];

  return section(copy.section('claimDetails'), rows);
}

export function buildWelshAsbSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const asb = 'detailsTab_AntisocialAndConductDetails';
  const rows = [
    textRow(copy.label('isASB'), yesNoText(getValue(data, `${asb}.antiSocialBehaviour`), copy, 'isAre')),
    textRow(copy.label('asbDetails'), getString(data, `${asb}.antiSocialBehaviourDetails`)),
    textRow(copy.label('isIllegalPurposes'), yesNoText(getValue(data, `${asb}.propertyUsedIllegally`), copy, 'isAre')),
    textRow(copy.label('illegalPurposesDetails'), getString(data, `${asb}.propertyUsedIllegallyDetails`)),
    textRow(
      copy.label('isOtherProhibitedConduct'),
      yesNoText(getValue(data, `${asb}.otherProhibitedConduct`), copy, 'isAre')
    ),
    textRow(copy.label('otherProhibitedConductDetails'), getString(data, `${asb}.otherProhibitedConductDetails`)),
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
    textRow(copy.label('rentAmount'), getString(data, 'detailsTab_RentArrearsDetails.rentAmount')),
    textRow(
      copy.label('howIsRentCalculated'),
      localisedLabel(
        copy,
        'rentFrequencies',
        RENT_FREQUENCY_LABELS,
        getFirstString(data, [
          'detailsTab_RentArrearsDetails.calculationFrequency',
          'detailsTab_RentArrearsDetails.rentFrequency',
          'summaryTab_RentArrearsDetails.calculationFrequency',
        ])
      )
    ),
    textRow(copy.label('totalRentArrears'), getString(data, 'detailsTab_RentArrearsDetails.arrearsTotal')),
    textRow(
      copy.label('previousSteps'),
      yesNoText(getValue(data, 'detailsTab_RentArrearsDetails.stepsToRecoverArrears'), copy, 'past')
    ),
    textRow(
      copy.label('previousStepsDetails'),
      getString(data, 'detailsTab_RentArrearsDetails.stepsToRecoverArrearsDetails')
    ),
    textRow(
      copy.label('judgmentRequested'),
      yesNoText(getValue(data, 'detailsTab_RentArrearsDetails.judgmentRequested'), copy, 'isAre')
    ),
    htmlRow(
      copy.label('rentStatement'),
      collectionDocumentLinksHtml(data, caseReference, 'detailsTab_RentArrearsDetails.rentStatement') ??
        documentLinksHtml(documents, caseReference, {
          documentTypes: ['RENT_STATEMENT'],
        })
    ),
  ];

  return section(copy.section('rentArrears'), rows);
}

export function buildActionTakenSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('preActionProtocol'),
      yesNoText(
        getFirstValue(data, ['preActionProtocolCompleted', 'detailsTab_ActionsTakenDetails.preactionProtocolFollowed']),
        copy,
        'past'
      )
    ),
    textRow(
      copy.label('preActionProtocolReason'),
      getFirstString(data, [
        'detailsTab_ActionsTakenDetails.preActionProtocolIncompleteExplanation',
        'preActionProtocolIncompleteExplanation',
      ])
    ),
    textRow(
      copy.label('mediationAttempted'),
      yesNoText(
        getFirstValue(data, ['mediationAttempted', 'detailsTab_ActionsTakenDetails.mediationAttempted']),
        copy,
        'past'
      )
    ),
    textRow(
      copy.label('settlementAttempted'),
      yesNoText(
        getFirstValue(data, ['settlementAttempted', 'detailsTab_ActionsTakenDetails.settlementAttempted']),
        copy,
        'past'
      )
    ),
  ];

  return section(copy.section('actionTaken'), rows);
}

export function buildNoticeDetailsSection(
  data: UnknownRecord,
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const notice = 'detailsTab_NoticeDetails';
  const rows = [
    textRow(copy.label('noticeServed'), yesNoText(getValue(data, `${notice}.noticeServed`), copy, 'past')),
    textRow(copy.label('noticeNotServedReason'), getString(data, `${notice}.statement`)),
    textRow(copy.label('noticeType'), getString(data, `${notice}.typeOfNoticeServed`)),
    textRow(
      copy.label('noticeServiceMethod'),
      localisedLabel(copy, 'noticeMethods', NOTICE_SERVICE_METHOD_LABELS, getString(data, `${notice}.noticeMethod`))
    ),
    textRow(copy.label('noticeDate'), formatDate(noticeDateValue(data), copy.locale)),
    textRow(copy.label('noticeTime'), formatTime(noticeDateTimeValue(data), copy.locale)),
    textRow(copy.label('noticePersonName'), getString(data, `${notice}.noticePersonName`)),
    textRow(copy.label('noticeEmailAddress'), getString(data, `${notice}.noticeEmailAddress`)),
    textRow(copy.label('noticeOtherElectronic'), getString(data, `${notice}.noticeOtherElectronicDetails`)),
    textRow(copy.label('noticeOtherMeans'), getString(data, `${notice}.noticeOtherExplanation`)),
    textRow(copy.label('canUploadNotice'), yesNoText(getValue(data, `${notice}.noticeUploaded`), copy, 'isAre')),
    textRow(copy.label('cannotUploadNoticeReason'), getString(data, `${notice}.reasonsForNoNoticeDocument`)),
    htmlRow(
      copy.label('noticeDocument'),
      collectionDocumentLinksHtml(data, caseReference, `${notice}.noticeDocuments`) ??
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
  const tenancy = 'detailsTab_TenancyLicenceDetails';
  const occupation = 'detailsTab_OccupationContractLicenceDetails';

  const rows = [
    textRow(
      copy.label('tenancyType'),
      localisedLabel(
        copy,
        'tenancyTypes',
        TENANCY_TYPE_LABELS,
        getFirstString(data, [`${tenancy}.typeOfTenancyLicence`, `${occupation}.agreementType`])
      )
    ),
    textRow(
      copy.label('tenancyStartDate'),
      formatDate(getFirstValue(data, ['tenancy_TenancyLicenceDate', 'licenceStartDate']), copy.locale) ??
        getFirstString(data, [`${tenancy}.tenancyLicenceDate`, `${occupation}.agreementStartDate`])
    ),
    textRow(
      copy.label('tenancyCopy'),
      yesNoText(getValue(data, `${tenancy}.hasCopyOfTenancyLicence`), copy, 'isThere')
    ),
    textRow(copy.label('tenancyNoCopyReason'), getString(data, `${tenancy}.reasonsForNoTenancyLicenceDocuments`)),
    htmlRow(
      copy.label('tenancyDocument'),
      tenancyDocumentLinksHtml(data, caseReference) ??
        documentLinksHtml(documents, caseReference, {
          filenameIncludes: ['tenancy', 'licence', 'license', 'occupation'],
        })
    ),
  ];

  return section(copy.section('tenancyDetails'), rows);
}

function tenancyDocumentLinksHtml(data: UnknownRecord, caseReference: string): string | undefined {
  return (
    collectionDocumentLinksHtml(data, caseReference, 'detailsTab_TenancyLicenceDetails.tenancyLicenceDocuments') ??
    collectionDocumentLinksHtml(data, caseReference, 'detailsTab_OccupationContractLicenceDetails.documents')
  );
}

function collectionDocumentLinksHtml(data: UnknownRecord, caseReference: string, path: string): string | undefined {
  const links = getArray(getValue(data, path))
    .map(item => asRecord(item))
    .map(item => ({
      id: getString(item ?? {}, 'id'),
      filename: getString(item ?? {}, 'value.document_filename'),
    }))
    .filter((document): document is { id: string; filename: string } => !!document.id && !!document.filename)
    .map(document => linkHtml(document.filename, `/case/${caseReference}/view-documents/${document.id}`));

  return links.length > 0 ? links.join('<br>') : undefined;
}

export function buildClaimantCircumstancesSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('claimantCircumstancesQuestion'),
      yesNoText(getValue(data, 'detailsTab_ClaimantCircumstances.claimantCircumstancesGiven'), copy, 'isThere')
    ),
    textRow(
      copy.label('claimantCircumstancesDetails'),
      getString(data, 'detailsTab_ClaimantCircumstances.claimantCircumstancesDetails')
    ),
  ];

  return section(copy.section('claimantCircumstances'), rows);
}

export function buildDefendantCircumstancesSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('defendantCircumstancesQuestion'),
      yesNoText(getValue(data, 'detailsTab_DefendantCircumstanceDetails.defendantCircumstancesGiven'), copy, 'isThere')
    ),
    textRow(
      copy.label('defendantCircumstancesDetails'),
      getString(data, 'detailsTab_DefendantCircumstanceDetails.defendantCircumstances')
    ),
  ];

  return section(copy.section('defendantCircumstances'), rows);
}

export function buildUnderlesseeTriageSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  return section(copy.section('underlesseeTriage'), [
    textRow(
      copy.label('hasUnderlesseeOrMortgagee'),
      yesNoText(getFirstValue(data, ['hasUnderlesseeOrMortgagee']), copy, 'isThere') ??
        yesNoText(getValue(data, 'detailsTab_MortgageOneDetails.nameKnown'), copy, 'isThere') ??
        ([firstUnderlesseeParty(data), ...additionalUnderlesseeParties(data)].some(
          party => party && (getString(party, 'orgName') || getString(party, 'name'))
        )
          ? yesNoText('YES', copy, 'isThere')
          : yesNoText('NO', copy, 'isThere'))
    ),
  ]);
}

export function buildUnderlesseeSection(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const tabParty = asRecord(getValue(data, 'detailsTab_MortgageOneDetails'));
  const party = firstUnderlesseeParty(data) ?? tabParty;

  return section(copy.section('underlesseeDetails'), [
    textRow(copy.label('underlesseeName'), underlesseeName(party, copy) ?? underlesseeName(tabParty, copy)),
    partyAddressRow(party ?? tabParty, propertyAddress, copy.label('underlesseeAddress'), copy),
  ]);
}

export function buildAdditionalUnderlesseeSections(
  data: UnknownRecord,
  propertyAddress: unknown,
  copy: ViewTheClaimCopy
): ViewTheClaimSection[] {
  const parties = additionalUnderlesseeParties(data);

  return parties
    .map((party, index) => {
      const tabParty = asRecord(getValue(data, `detailsTab_MortgageDetails.${index}.value`));

      return section(copy.section('additionalUnderlesseeDetails', { number: index + 1 }), [
        textRow(copy.label('underlesseeName'), underlesseeName(party, copy) ?? underlesseeName(tabParty, copy)),
        partyAddressRow(party ?? tabParty, propertyAddress, copy.label('underlesseeAddress'), copy),
      ]);
    })
    .filter((sectionItem): sectionItem is ViewTheClaimSection => !!sectionItem);
}

export function buildDemotionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('demotionQuestion'),
      getValue(data, 'detailsTab_DemotionOfTenancyDetails') ? yesNoText('YES', copy, 'isAre') : undefined
    ),
    textRow(
      copy.label('demotionHousingAct'),
      localisedLabel(
        copy,
        'housingActSections',
        HOUSING_ACT_LABELS,
        getString(data, 'detailsTab_DemotionOfTenancyDetails.housingAct')
      )
    ),
    textRow(
      copy.label('demotionStatement'),
      yesNoText(getValue(data, 'detailsTab_DemotionOfTenancyDetails.statementOfExpressTermsServed'), copy, 'isAre')
    ),
    textRow(copy.label('demotionDetails'), getString(data, 'detailsTab_DemotionOfTenancyDetails.terms')),
    textRow(copy.label('demotionReason'), getString(data, 'detailsTab_DemotionOfTenancyDetails.reasons')),
  ];

  return section(copy.section('demotion'), rows);
}

export function buildSuspensionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('suspensionQuestion'),
      getValue(data, 'detailsTab_SuspensionOfRightToBuyDetails') ? yesNoText('YES', copy, 'isAre') : undefined
    ),
    textRow(
      copy.label('suspensionHousingAct'),
      localisedLabel(
        copy,
        'housingActSections',
        HOUSING_ACT_LABELS,
        getString(data, 'detailsTab_SuspensionOfRightToBuyDetails.housingAct')
      )
    ),
    textRow(copy.label('suspensionReason'), getString(data, 'detailsTab_SuspensionOfRightToBuyDetails.reasons')),
  ];

  return section(copy.section('suspension'), rows);
}

export function buildProhibitedConductSection(
  data: UnknownRecord,
  copy: ViewTheClaimCopy
): ViewTheClaimSection | undefined {
  const rows = [
    textRow(
      copy.label('prohibitedConductQuestion'),
      yesNoText(
        getValue(data, 'detailsTab_ProhibitedConductStandardContractDetails.seekingProhibitedConductStandardContract'),
        copy,
        'isAre'
      )
    ),
    textRow(
      copy.label('prohibitedConductAgreement'),
      yesNoText(getValue(data, 'detailsTab_ProhibitedConductStandardContractDetails.agreedTerms'), copy, 'isAre')
    ),
    textRow(
      copy.label('prohibitedConductDetails'),
      getString(data, 'detailsTab_ProhibitedConductStandardContractDetails.termDetails')
    ),
    textRow(
      copy.label('prohibitedConductReason'),
      getString(data, 'detailsTab_ProhibitedConductStandardContractDetails.whyMakingClaim')
    ),
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
    textRow(
      copy.label('epcQuestion'),
      yesNoText(getValue(data, 'detailsTab_RequiredDocumentsDetails.hasEnergyPerformanceCertificate'), copy, 'isAre')
    ),
    textRow(
      copy.label('epcReason'),
      getString(data, 'detailsTab_RequiredDocumentsDetails.noEnergyPerformanceCertificateReason')
    ),
    htmlRow(
      copy.label('epcDocument'),
      collectionDocumentLinksHtml(
        data,
        caseReference,
        'detailsTab_RequiredDocumentsDetails.energyPerformanceCertificates'
      ) ??
        documentLinksHtml(documents, caseReference, {
          documentTypes: ['ENERGY_PERFORMANCE_CERTIFICATE'],
        })
    ),
    textRow(
      copy.label('gasQuestion'),
      yesNoText(getValue(data, 'detailsTab_RequiredDocumentsDetails.hasGasSafetyReport'), copy, 'isAre')
    ),
    textRow(copy.label('gasReason'), getString(data, 'detailsTab_RequiredDocumentsDetails.noGasSafetyReportReason')),
    htmlRow(
      copy.label('gasDocument'),
      collectionDocumentLinksHtml(data, caseReference, 'detailsTab_RequiredDocumentsDetails.gasSafetyReports') ??
        documentLinksHtml(documents, caseReference, { documentTypes: ['GAS_SAFETY_REPORT'] })
    ),
    textRow(
      copy.label('eicrQuestion'),
      yesNoText(
        getValue(data, 'detailsTab_RequiredDocumentsDetails.hasElectricalInstallationConditionReport'),
        copy,
        'isAre'
      )
    ),
    textRow(
      copy.label('eicrReason'),
      getString(data, 'detailsTab_RequiredDocumentsDetails.noElectricalInstallationConditionReportReason')
    ),
    htmlRow(
      copy.label('eicrDocument'),
      collectionDocumentLinksHtml(
        data,
        caseReference,
        'detailsTab_RequiredDocumentsDetails.electricalInstallationReports'
      ) ??
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
    localisedLabel(
      copy,
      'statementOfTruthCompletedBy',
      STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS,
      enumText(statementOfTruth.completedBy, STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS)
    );
  const firmName = getFirstString(statementOfTruth, ['firmNameLegalRep']);
  const position = getFirstString(statementOfTruth, ['positionLegalRep', 'positionParty', 'positionClaimant']);
  const rows = [
    htmlRow(copy.label('statementOfTruthCompletedBy'), [completedBy, firmName, position].filter(Boolean).join('<br>')),
  ];

  return section(copy.section('statementOfTruth'), rows);
}
