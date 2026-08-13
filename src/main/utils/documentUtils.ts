import { get } from 'lodash';

import type { CcdCaseDocument } from '@services/ccdCase.interface';

const DOCUMENT_FOLDER_TITLES = {
  statementsOfCase: 'Statements of case',
  propertyDocuments: 'Property documents',
  evidence: 'Evidence',
  correspondence: 'Correspondence',
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
}

export function extractViewDocumentFolders(
  caseData: CaseData,
  { folderTitles }: ExtractViewDocumentOptions = {}
): ViewDocumentFolder[] {
  const folders = createFolders(folderTitles);

  for (const { id, value } of caseData.allDocuments ?? []) {
    const documentId = id?.trim();

    if (!documentId || !isDocumentFolderKey(value.category_id)) {
      continue;
    }

    const filename = value.document_filename?.trim();

    if (!filename) {
      continue;
    }

    folders[value.category_id].documents.push({
      id: documentId,
      filename,
      submittedOn: value.upload_timestamp?.trim() || null,
    });
  }

  return Object.values(folders).filter(folder => folder.documents.length > 0);
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
  return extractCaseDocuments(caseData).find(document => {
    if (document.id === documentId) {
      return true;
    }
    const urlUuid = document.binaryUrl ? document.binaryUrl.split('/documents/')[1]?.split('/')[0] : undefined;
    return urlUuid === documentId;
  });
}

export function extractCaseDocuments(caseData: CaseDataRecord): CaseDocumentLookupItem[] {
  const documents: CaseDocumentLookupItem[] = [];
  const seen = new Set<string>();

  addDocumentsFromCollection(documents, seen, caseData.allDocuments, 'allDocuments');
  addDocumentsFromCollection(documents, seen, caseData.notice_Documents, 'notice_Documents');
  addDocumentsFromCollection(
    documents,
    seen,
    caseData.rentArrears_StatementDocuments,
    'rentArrears_StatementDocuments'
  );
  addDocumentsFromCollection(documents, seen, caseData.rentStatement, 'rentStatement');

  for (const path of CASE_DETAILS_DOCUMENT_PATHS) {
    addDocumentsFromCollection(documents, seen, get(caseData, path), path);
  }

  return documents;
}

function createFolders(
  folderTitles?: Partial<Record<DocumentFolderKey, string>>
): Record<DocumentFolderKey, ViewDocumentFolder> {
  const titles = {
    ...DOCUMENT_FOLDER_TITLES,
    ...folderTitles,
  };

  return {
    statementsOfCase: { title: titles.statementsOfCase, documents: [] },
    propertyDocuments: { title: titles.propertyDocuments, documents: [] },
    evidence: { title: titles.evidence, documents: [] },
    correspondence: { title: titles.correspondence, documents: [] },
  };
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
    if (!item || typeof item !== 'object') {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const val = (rec.value as Record<string, unknown>) ?? rec;
    const docObj = (val.document as Record<string, unknown>) ?? val;

    const url = (docObj.document_url ||
      docObj.document_binary_url ||
      val.document_url ||
      val.document_binary_url ||
      rec.document_url ||
      rec.document_binary_url) as string | undefined;

    const binaryUrl = (docObj.document_binary_url ||
      val.document_binary_url ||
      rec.document_binary_url ||
      (url ? `${url}/binary` : undefined)) as string | undefined;

    const filename = (docObj.document_filename ||
      val.document_filename ||
      rec.document_filename ||
      'document') as string;

    const urlId = url ? url.split('/documents/')[1]?.split('/')[0] : undefined;
    const id = (stringValue(rec.id) || stringValue(val.id) || stringValue(docObj.id) || urlId) as string | undefined;

    if (!id || !binaryUrl || seen.has(id)) {
      continue;
    }

    seen.add(id);
    documents.push({
      id,
      filename,
      binaryUrl,
      categoryId: stringValue(docObj.category_id || val.category_id || rec.category_id),
      documentType: stringValue(docObj.document_type || val.document_type || rec.document_type),
      sourceField,
    });
  }
}

function asCollection(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }
  if (value && typeof value === 'object') {
    return [value as Record<string, unknown>];
  }
  return [];
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text = String(value).trim();
  return text || undefined;
}
