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
  locale?: string;
  submittedOnPrefix?: string;
  folderTitles?: Partial<Record<DocumentFolderKey, string>>;
}

export function extractViewDocumentFolders(
  caseData: CaseData,
  { locale = 'en-GB', submittedOnPrefix = 'Submitted on', folderTitles }: ExtractViewDocumentOptions = {}
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
      submittedOn: formatSubmittedOn(value.upload_timestamp, locale, submittedOnPrefix),
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

export function formatSubmittedOn(dateValue?: string, locale = 'en-GB', submittedOnPrefix = 'Submitted on'): string | null {
  if (!dateValue) {
    return null;
  }

  const date = new Date(normaliseDateValue(dateValue));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${submittedOnPrefix} ${new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)}`;
}

function normaliseDateValue(value: string): string {
  return value.replace(
    /(\.\d{3})\d+(Z?)$/,
    (_, milliseconds: string, zoneSuffix: string) => `${milliseconds}${zoneSuffix}`
  );
}
