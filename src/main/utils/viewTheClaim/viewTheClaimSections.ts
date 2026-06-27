import { STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS } from './viewTheClaimLabels';
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
  formatTime,
  getArray,
  getFirstAddressHtml,
  getFirstPartyName,
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
    textRow(
      copy.label('isExemptLandlord'),
      yesNoText(getValue(data, 'detailsTab_ClaimantRegistrationAndLicensingDetails.isExemptLandlord'))
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
    htmlRow(
      copy.label('addressForService'),
      partyAddressHtml(defendant, propertyAddress) ??
        getFirstAddressHtml(data, [
          'detailsTab_DefendantInformationDetails.addressForService',
          'casePartiesTab_DefendantOneDetails.serviceAddress',
          'summaryTab_DefendantDetails.addressForService',
        ])
    ),
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
        textRow(
          copy.label('defendantName'),
          partyName(defendant, copy) ??
            getFirstPartyName(
              data,
              [
                `detailsTab_AdditionalDefendants.${index}.value`,
                `casePartiesTab_DefendantsDetails.${index}.value`,
                `summaryTab_AdditionalDefendants.${index}.value`,
              ],
              copy
            )
        ),
        htmlRow(
          copy.label('addressForService'),
          partyAddressHtml(defendant, propertyAddress) ??
            getFirstAddressHtml(data, [
              `detailsTab_AdditionalDefendants.${index}.value.addressForService`,
              `casePartiesTab_DefendantsDetails.${index}.value.serviceAddress`,
              `summaryTab_AdditionalDefendants.${index}.value.addressForService`,
            ])
        ),
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
    textRow(copy.label('hasGrounds'), groundLabels(data).length > 0 ? 'Yes' : undefined),
    htmlRow(copy.label('groundsForPossession'), listHtml(groundLabels(data))),
    htmlRow(copy.label('descriptionOfGrounds'), listHtml(otherGroundDescriptions(data))),
    ...groundReasonRows(data, copy),
    textRow(copy.label('whyClaimingPossession'), getFirstString(data, ['noGrounds', 'absoluteGrounds'])),
    textRow(
      copy.label('otherInfoAboutReasons'),
      yesNoText(getFirstValue(data, ['detailsTab_ReasonsForPossessionDetails.hasAdditionalReasons'])) ??
        (getFirstString(data, ['detailsTab_ReasonsForPossessionDetails.otherGrounds']) ? 'Yes' : undefined)
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
    textRow(copy.label('isASB'), yesNoText(getValue(data, `${asb}.antiSocialBehaviour`))),
    textRow(copy.label('asbDetails'), getString(data, `${asb}.antiSocialBehaviourDetails`)),
    textRow(copy.label('isIllegalPurposes'), yesNoText(getValue(data, `${asb}.propertyUsedIllegally`))),
    textRow(copy.label('illegalPurposesDetails'), getString(data, `${asb}.propertyUsedIllegallyDetails`)),
    textRow(copy.label('isOtherProhibitedConduct'), yesNoText(getValue(data, `${asb}.otherProhibitedConduct`))),
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
      getFirstString(data, [
        'detailsTab_RentArrearsDetails.calculationFrequency',
        'detailsTab_RentArrearsDetails.rentFrequency',
        'summaryTab_RentArrearsDetails.calculationFrequency',
      ])
    ),
    textRow(copy.label('totalRentArrears'), getString(data, 'detailsTab_RentArrearsDetails.arrearsTotal')),
    textRow(
      copy.label('previousSteps'),
      yesNoText(getValue(data, 'detailsTab_RentArrearsDetails.stepsToRecoverArrears'))
    ),
    textRow(
      copy.label('previousStepsDetails'),
      getString(data, 'detailsTab_RentArrearsDetails.stepsToRecoverArrearsDetails')
    ),
    textRow(
      copy.label('judgmentRequested'),
      yesNoText(getValue(data, 'detailsTab_RentArrearsDetails.judgmentRequested'))
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
      yesNoText(getValue(data, 'detailsTab_ActionsTakenDetails.preactionProtocolFollowed'))
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
      yesNoText(getValue(data, 'detailsTab_ActionsTakenDetails.mediationAttempted'))
    ),
    textRow(
      copy.label('settlementAttempted'),
      yesNoText(getValue(data, 'detailsTab_ActionsTakenDetails.settlementAttempted'))
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
    textRow(copy.label('noticeServed'), yesNoText(getValue(data, `${notice}.noticeServed`))),
    textRow(copy.label('noticeNotServedReason'), getString(data, `${notice}.statement`)),
    textRow(copy.label('noticeType'), getString(data, `${notice}.typeOfNoticeServed`)),
    textRow(copy.label('noticeServiceMethod'), getString(data, `${notice}.noticeMethod`)),
    textRow(copy.label('noticeDate'), getString(data, `${notice}.noticeDate`)),
    textRow(copy.label('noticeTime'), formatTime(noticeDateTimeValue(data))),
    textRow(copy.label('noticePersonName'), getString(data, `${notice}.noticePersonName`)),
    textRow(copy.label('noticeEmailAddress'), getString(data, `${notice}.noticeEmailAddress`)),
    textRow(copy.label('noticeOtherElectronic'), getString(data, `${notice}.noticeOtherElectronicDetails`)),
    textRow(copy.label('noticeOtherMeans'), getString(data, `${notice}.noticeOtherExplanation`)),
    textRow(copy.label('canUploadNotice'), yesNoText(getValue(data, `${notice}.noticeUploaded`))),
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
      getFirstString(data, [`${tenancy}.typeOfTenancyLicence`, `${occupation}.agreementType`])
    ),
    textRow(
      copy.label('tenancyStartDate'),
      getFirstString(data, [`${tenancy}.tenancyLicenceDate`, `${occupation}.agreementStartDate`])
    ),
    textRow(copy.label('tenancyCopy'), yesNoText(getValue(data, `${tenancy}.hasCopyOfTenancyLicence`))),
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
      yesNoText(getValue(data, 'detailsTab_ClaimantCircumstances.claimantCircumstancesGiven'))
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
      yesNoText(getValue(data, 'detailsTab_DefendantCircumstanceDetails.defendantCircumstancesGiven'))
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
      yesNoText(getFirstValue(data, ['hasUnderlesseeOrMortgagee'])) ??
        yesNoText(getValue(data, 'detailsTab_MortgageOneDetails.nameKnown'))
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
    htmlRow(
      copy.label('underlesseeAddress'),
      partyAddressHtml(party, propertyAddress) ??
        partyAddressHtml(tabParty, propertyAddress) ??
        getFirstAddressHtml(data, ['detailsTab_MortgageOneDetails.address'])
    ),
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
        htmlRow(
          copy.label('underlesseeAddress'),
          partyAddressHtml(party, propertyAddress) ??
            partyAddressHtml(tabParty, propertyAddress) ??
            getFirstAddressHtml(data, [`detailsTab_MortgageDetails.${index}.value.address`])
        ),
      ]);
    })
    .filter((sectionItem): sectionItem is ViewTheClaimSection => !!sectionItem);
}

export function buildDemotionSection(data: UnknownRecord, copy: ViewTheClaimCopy): ViewTheClaimSection | undefined {
  const rows = [
    textRow(copy.label('demotionQuestion'), getValue(data, 'detailsTab_DemotionOfTenancyDetails') ? 'Yes' : undefined),
    textRow(copy.label('demotionHousingAct'), getString(data, 'detailsTab_DemotionOfTenancyDetails.housingAct')),
    textRow(
      copy.label('demotionStatement'),
      yesNoText(getValue(data, 'detailsTab_DemotionOfTenancyDetails.statementOfExpressTermsServed'))
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
      getValue(data, 'detailsTab_SuspensionOfRightToBuyDetails') ? 'Yes' : undefined
    ),
    textRow(copy.label('suspensionHousingAct'), getString(data, 'detailsTab_SuspensionOfRightToBuyDetails.housingAct')),
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
      getString(data, 'detailsTab_ProhibitedConductStandardContractDetails.seekingProhibitedConductStandardContract')
    ),
    textRow(
      copy.label('prohibitedConductAgreement'),
      getString(data, 'detailsTab_ProhibitedConductStandardContractDetails.agreedTerms')
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
      getString(data, 'detailsTab_RequiredDocumentsDetails.hasEnergyPerformanceCertificate')
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
    textRow(copy.label('gasQuestion'), getString(data, 'detailsTab_RequiredDocumentsDetails.hasGasSafetyReport')),
    textRow(copy.label('gasReason'), getString(data, 'detailsTab_RequiredDocumentsDetails.noGasSafetyReportReason')),
    htmlRow(
      copy.label('gasDocument'),
      collectionDocumentLinksHtml(data, caseReference, 'detailsTab_RequiredDocumentsDetails.gasSafetyReports') ??
        documentLinksHtml(documents, caseReference, { documentTypes: ['GAS_SAFETY_REPORT'] })
    ),
    textRow(
      copy.label('eicrQuestion'),
      getString(data, 'detailsTab_RequiredDocumentsDetails.hasElectricalInstallationConditionReport')
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
    enumText(statementOfTruth.completedBy, STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS);
  const firmName = getFirstString(statementOfTruth, ['firmNameLegalRep']);
  const position = getFirstString(statementOfTruth, ['positionLegalRep', 'positionParty', 'positionClaimant']);
  const rows = [
    htmlRow(copy.label('statementOfTruthCompletedBy'), [completedBy, firmName, position].filter(Boolean).join('<br>')),
  ];

  return section(copy.section('statementOfTruth'), rows);
}
