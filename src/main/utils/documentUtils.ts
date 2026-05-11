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
    value: CcdCaseDocument;
  }[];
};

export interface ViewDocumentItem {
  id: string;
  filename: string;
  submittedOn: string | null;
}

export interface ViewDocumentFolder {
  title: string;
  documents: ViewDocumentItem[];
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
