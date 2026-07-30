import { get } from 'lodash';

import type { CcdCaseDocument } from '@services/ccdCase.interface';

const DOCUMENT_FOLDER_TITLES = {
  statementsOfCase: 'Statements of case',
  propertyDocuments: 'Property documents',
  evidence: 'Evidence',
  correspondence: 'Correspondence',
  uncategorisedDocuments: 'Uncategorised',
} as const;

type DocumentFolderKey = keyof typeof DOCUMENT_FOLDER_TITLES;

type CaseData = {
  allDocuments?: {
    id?: string;
    value: CcdCaseDocument & {
      category_id?: string;
    };
  }[];
};

type CaseDataRecord = Record<string, unknown>;

export interface ViewDocumentItem {
  id: string;
  filename: string;
  submittedOn: string | null;
}

export interface ViewDocumentFolder {
  title: string;
  documents: ViewDocumentItem[];
}

export interface CaseDocumentLookupItem {
  id: string;
  filename: string;
  binaryUrl: string;
  categoryId?: string;
  documentType?: string;
  sourceField: string;
}

interface ExtractViewDocumentOptions {
  folderTitles?: Partial<Record<DocumentFolderKey, string>>;
  includeUncategorised?: boolean;
}

export function extractViewDocumentFolders(
  caseData: CaseData,
  { folderTitles, includeUncategorised = false }: ExtractViewDocumentOptions = {}
): ViewDocumentFolder[] {
  const folders = createFolders(folderTitles, includeUncategorised);

  for (const { id, value } of caseData.allDocuments ?? []) {
    const documentId = id?.trim();

    if (!documentId || !isDocumentFolderKey(value.category_id)) {
      continue;
    }

    // The folder may be absent when its category is feature-flagged off (e.g. Uncategorised).
    const folder = folders[value.category_id];
    if (!folder) {
      continue;
    }

    const filename = value.document_filename?.trim();

    if (!filename) {
      continue;
    }

    folder.documents.push({
      id: documentId,
      filename,
      submittedOn: value.upload_timestamp?.trim() || null,
    });
  }

  return Object.values(folders).filter((folder): folder is ViewDocumentFolder => (folder?.documents.length ?? 0) > 0);
}

const CASE_DETAILS_DOCUMENT_PATHS = [
  'detailsTab_RentArrearsDetails.rentStatement',
  'detailsTab_TenancyLicenceDetails.tenancyLicenceDocuments',
  'detailsTab_OccupationContractLicenceDetails.documents',
  'detailsTab_NoticeDetails.noticeDocuments',
  'detailsTab_RequiredDocumentsDetails.energyPerformanceCertificates',
  'detailsTab_RequiredDocumentsDetails.gasSafetyReports',
  'detailsTab_RequiredDocumentsDetails.electricalInstallationReports',
] as const;

export function findCaseDocumentById(caseData: CaseDataRecord, documentId: string): CaseDocumentLookupItem | undefined {
  return extractCaseDocuments(caseData).find(document => document.id === documentId);
}

export function extractCaseDocuments(caseData: CaseDataRecord): CaseDocumentLookupItem[] {
  const documents: CaseDocumentLookupItem[] = [];
  const seen = new Set<string>();

  addDocumentsFromCollection(documents, seen, caseData.allDocuments, 'allDocuments');

  for (const path of CASE_DETAILS_DOCUMENT_PATHS) {
    addDocumentsFromCollection(documents, seen, get(caseData, path), path);
  }

  return documents;
}

function createFolders(
  folderTitles?: Partial<Record<DocumentFolderKey, string>>,
  includeUncategorised = false
): Partial<Record<DocumentFolderKey, ViewDocumentFolder>> {
  const titles = {
    ...DOCUMENT_FOLDER_TITLES,
    ...folderTitles,
  };

  const folders: Partial<Record<DocumentFolderKey, ViewDocumentFolder>> = {
    statementsOfCase: { title: titles.statementsOfCase, documents: [] },
    propertyDocuments: { title: titles.propertyDocuments, documents: [] },
    evidence: { title: titles.evidence, documents: [] },
    correspondence: { title: titles.correspondence, documents: [] },
  };

  // Added last so the Uncategorised folder renders after the known categories.
  if (includeUncategorised) {
    folders.uncategorisedDocuments = { title: titles.uncategorisedDocuments, documents: [] };
  }

  return folders;
}

function isDocumentFolderKey(value: unknown): value is DocumentFolderKey {
  return typeof value === 'string' && value in DOCUMENT_FOLDER_TITLES;
}

function addDocumentsFromCollection(
  documents: CaseDocumentLookupItem[],
  seen: Set<string>,
  collection: unknown,
  sourceField: string
): void {
  for (const item of asCollection(collection)) {
    const id = stringValue(item.id);
    const value = asRecord(item.value);
    const filename = stringValue(value?.document_filename);
    const binaryUrl = stringValue(value?.document_binary_url);

    if (!id || !filename || !binaryUrl || seen.has(id)) {
      continue;
    }

    seen.add(id);
    documents.push({
      id,
      filename,
      binaryUrl,
      categoryId: stringValue(value?.category_id),
      documentType: stringValue(value?.document_type ?? value?.documentType ?? value?.type),
      sourceField,
    });
  }
}

function asCollection(value: unknown): { id?: unknown; value?: unknown }[] {
  return Array.isArray(value) ? (value as { id?: unknown; value?: unknown }[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text = String(value).trim();
  return text || undefined;
}
