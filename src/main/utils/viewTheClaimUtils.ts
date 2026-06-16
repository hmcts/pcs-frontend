import type { TFunction } from 'i18next';

import {
  addressHtml,
  addressText,
  claimantName,
  formatDate,
  getFirstString,
  getFirstValue,
  getValue,
  sectionRows,
  summaryRow,
} from './viewTheClaimHelpers';
import {
  buildActionTakenSection,
  buildAdditionalDefendantSections,
  buildAdditionalUnderlesseeSections,
  buildClaimDetailsSection,
  buildClaimPdfSection,
  buildClaimantCircumstancesSection,
  buildClaimantSection,
  buildDefendantCircumstancesSection,
  buildDefendantSection,
  buildDemotionSection,
  buildNoticeDetailsSection,
  buildProhibitedConductSection,
  buildRentArrearsSection,
  buildRequiredDocumentsSection,
  buildStatementOfTruthSection,
  buildSuspensionSection,
  buildTenancySection,
  buildUnderlesseeSection,
  buildUnderlesseeTriageSection,
  buildWelshAsbSection,
} from './viewTheClaimSections';

import type { CcdCaseData } from '@services/ccdCase.interface';
import { extractCaseDocuments } from '@utils/documentUtils';

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

export type UnknownRecord = Record<string, unknown>;

export interface ViewTheClaimCopy {
  section: (key: string, options?: Record<string, unknown>) => string;
  label: (key: string, options?: Record<string, unknown>) => string;
  text: (key: string, options?: Record<string, unknown>) => string;
  personsUnknown: string;
}

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

function createViewTheClaimCopy(t: TFunction): ViewTheClaimCopy {
  return {
    section: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:sections.${key}`, options),
    label: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:labels.${key}`, options),
    text: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:${key}`, options),
    personsUnknown: t('viewTheClaim:personsUnknown'),
  };
}
