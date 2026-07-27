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

export function findCaseDocumentById(caseData: CaseDataRecord, documentId: string): CaseDocumentLookupItem | undefined {
  return extractCaseDocuments(caseData).find(document => document.id === documentId);
}

export function extractCaseDocuments(caseData: CaseDataRecord): CaseDocumentLookupItem[] {
  const documents: CaseDocumentLookupItem[] = [];
  const seen = new Set<string>();

  addFlatDocuments(documents, seen, caseData, 'allDocuments');

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

function addFlatDocuments(
  documents: CaseDocumentLookupItem[],
  seen: Set<string>,
  caseData: CaseDataRecord,
  sourceField: string
): void {
  for (const item of asCollection(caseData[sourceField])) {
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
