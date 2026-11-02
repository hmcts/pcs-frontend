import fs from 'fs';
import path from 'path';

// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

const INPUT_FILES_DIR = path.join(__dirname, '../../data/inputFiles');
const MANIFEST_PATH = path.join(__dirname, '../../.auth/test-documents.json');

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
};

export interface CcdDocument {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
}

export const TEST_DOCUMENT_SLOTS = [
  'tenancyLicenceDocuments.pdf',
  'RentArrearsStatement.pdf',
  'rentArrears.pdf',
  'WitnessStatement.png',
  'RentStatement.pdf',
  'NoticeServiceJurisdiction.docx',
  'CertificateOfSuitability.xlsx',
  'OtherDocument.png',
  'tentency.pdf',
] as const;

const mimeTypeFor = (fileName: string): string =>
  MIME_TYPES[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';

export async function uploadTestDocument(fileName: string): Promise<CcdDocument> {
  const filePath = path.join(INPUT_FILES_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test document '${fileName}' not found in ${INPUT_FILES_DIR}`);
  }

  const formData = new FormData();
  formData.append('files', new Blob([fs.readFileSync(filePath)], { type: mimeTypeFor(fileName) }), fileName);
  formData.append('classification', 'PUBLIC');
  formData.append('caseTypeId', process.env.CASE_TYPE_ID ?? 'PCS');
  formData.append('jurisdictionId', 'PCS');

  const response = await Axios.post(`${process.env.CDAM_URL}/cases/documents`, formData, {
    timeout: 30_000,
    headers: {
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
    },
  });

  const document = response.data?.documents?.[0];
  const selfHref = document?._links?.self?.href;
  const binaryHref = document?._links?.binary?.href;
  if (!selfHref || !binaryHref) {
    throw new Error(`CDAM returned no document links for '${fileName}'`);
  }

  return {
    document_url: selfHref,
    document_binary_url: binaryHref,
    document_filename: document.originalDocumentName ?? fileName,
  };
}

export async function uploadTestDocuments(): Promise<void> {
  if (!process.env.CDAM_URL) {
    throw new Error('CDAM_URL is not set');
  }
  if (fs.existsSync(MANIFEST_PATH)) {
    return;
  }
  const uploads = await Promise.all(
    TEST_DOCUMENT_SLOTS.map(async file => [file, await uploadTestDocument(file)] as const)
  );
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(Object.fromEntries(uploads), null, 2), 'utf8');
}

let manifest: Record<string, CcdDocument> | undefined;

export function testDocument(fileName: string): CcdDocument {
  manifest ??= JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, CcdDocument>;
  const document = manifest[fileName];
  if (!document) {
    throw new Error(`No uploaded test document for '${fileName}'`);
  }
  return document;
}
