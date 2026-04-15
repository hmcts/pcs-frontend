import type { CcdCollectionItem, CcdDocumentReference } from '@interfaces/ccdCase.interface';
import type { CdamDocument } from '@interfaces/documentUpload.interface';

export const UPLOAD_MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;
export const UPLOAD_MAX_FILE_SIZE_MB = 1024;

export const BLOCKED_EXTENSIONS = new Set(['.mp3', '.m4a', '.mp4', '.mpeg', '.mpg']);

const BLOCKED_MIME_PREFIXES = ['audio/', 'video/'] as const;

const BLOCKED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.template',
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  'text/plain',
  'text/csv',
  'application/rtf',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/x-tiff',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.doc',
  '.dot',
  '.docx',
  '.dotx',
  '.xls',
  '.xlt',
  '.xla',
  '.xlsx',
  '.xltx',
  '.xlsb',
  '.ppt',
  '.pot',
  '.pps',
  '.ppa',
  '.pptx',
  '.potx',
  '.ppsx',
  '.pdf',
  '.txt',
  '.rtf',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.bmp',
  '.tif',
  '.tiff',
]);

export const ACCEPT_ATTRIBUTE_EXTENSIONS = Array.from(ALLOWED_EXTENSIONS).sort().join(',');

export function getFileExtensionLower(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export function isBlockedExtension(filename: string): boolean {
  return BLOCKED_EXTENSIONS.has(getFileExtensionLower(filename));
}

export type UploadFileValidationResult = 'ok' | 'blocked_media' | 'invalid_type';

// Shared by any step that uses the MOJ multi-file upload component. Import
export function parseUploadedDocuments(body: Record<string, unknown>): CdamDocument[] {
  const raw = body['uploadedDocuments[]'];
  if (!raw) {
    return [];
  }

  const items = Array.isArray(raw) ? raw : [raw];
  const documents: CdamDocument[] = [];

  for (const item of items) {
    try {
      const parsed = typeof item === 'string' ? JSON.parse(item) : item;
      if (parsed?.document_url && parsed?.document_binary_url && parsed?.document_filename) {
        const doc: CdamDocument = {
          document_url: parsed.document_url,
          document_binary_url: parsed.document_binary_url,
          document_filename: parsed.document_filename,
        };
        if (typeof parsed.content_type === 'string' && parsed.content_type) {
          doc.content_type = parsed.content_type;
        }
        const sizeNum = typeof parsed.size === 'number' ? parsed.size : Number(parsed.size);
        if (!Number.isNaN(sizeNum) && sizeNum >= 0) {
          doc.size = sizeNum;
        }
        documents.push(doc);
      }
    } catch {
      // Skip malformed entries
    }
  }

  return documents;
}

// Maps normalised CdamDocument objects to the CCD collection format expected by defendantUploadedDocuments
export function toCcdDocumentCollection(docs: CdamDocument[]): CcdCollectionItem<CcdDocumentReference>[] {
  return docs.map(doc => {
    const value: CcdDocumentReference = {
      document_url: doc.document_url,
      document_binary_url: doc.document_binary_url,
      document_filename: doc.document_filename,
    };
    if (doc.content_type !== undefined && doc.content_type !== null) {
      value.content_type = doc.content_type;
    }
    if (doc.size !== undefined && doc.size !== null) {
      value.size = doc.size;
    }
    return { value };
  });
}

export function validateUploadFile(mimetype: string, originalname: string): UploadFileValidationResult {
  const ext = getFileExtensionLower(originalname);
  const mime = (mimetype || '').toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return 'blocked_media';
  }
  if (BLOCKED_MIME_TYPES.has(mime)) {
    return 'blocked_media';
  }
  for (const prefix of BLOCKED_MIME_PREFIXES) {
    if (mime.startsWith(prefix)) {
      return 'blocked_media';
    }
  }

  if (ALLOWED_MIME_TYPES.has(mime)) {
    return 'ok';
  }

  if (mime === '' || mime === 'application/octet-stream') {
    return ALLOWED_EXTENSIONS.has(ext) ? 'ok' : 'invalid_type';
  }

  return 'invalid_type';
}
