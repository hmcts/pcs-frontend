import config from 'config';

import {
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  getFileExtensionLower,
  isMediaExtension,
} from './fileExtensionValidation';

export {
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  MEDIA_EXTENSIONS,
  getFileExtensionLower,
  isAllowedExtension,
  isBlockedExtension,
  isMediaExtension,
} from './fileExtensionValidation';

export const UPLOAD_MAX_FILE_SIZE_MB: number = config.get('documentUpload.maxFileSizePerFileMB');
export const UPLOAD_MAX_FILE_SIZE_BYTES = UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;
export const UPLOAD_MAX_MEDIA_FILE_SIZE_MB: number = config.get('documentUpload.maxMediaFileSizeMB');
export const UPLOAD_MAX_MEDIA_FILE_SIZE_BYTES = UPLOAD_MAX_MEDIA_FILE_SIZE_MB * 1024 * 1024;
export const UPLOAD_MAX_TOTAL_SIZE_MB: number = config.get('documentUpload.maxTotalFileSizeMB');
export const UPLOAD_MAX_TOTAL_SIZE_BYTES = UPLOAD_MAX_TOTAL_SIZE_MB * 1024 * 1024;
export const UPLOAD_MAX_DOCUMENT_FILE_SIZE_MB: number = config.get('documentUpload.maxDocumentFileSizeMB');
export const UPLOAD_MAX_DOCUMENT_FILE_SIZE_BYTES = UPLOAD_MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;
export const UPLOAD_MAX_FILENAME_LENGTH: number = config.get('documentUpload.maxFilenameLength');

const BLOCKED_MEDIA_PREFIXES = ['audio/', 'video/'] as const;

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

export const ACCEPT_ATTRIBUTE_EXTENSIONS = Array.from(ALLOWED_EXTENSIONS)
  .sort((a, b) => a.localeCompare(b))
  .join(',');

// Locale messages render sizes as friendly units. Whole gigabytes render as "1GB"; anything
// else (e.g. 500) renders as "{N}MB". Numbers come from config, the unit is presentation.
export function formatSizeForDisplay(mb: number): string {
  return mb > 0 && mb % 1024 === 0 ? `${mb / 1024}GB` : `${mb}MB`;
}

function isBlockedMedia(mime: string, ext: string): boolean {
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return true;
  }
  return BLOCKED_MEDIA_PREFIXES.some(prefix => mime.startsWith(prefix));
}

function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime);
}

function isUnknownMimeType(mime: string): boolean {
  return mime === '' || mime === 'application/octet-stream';
}

export type FileValidationResult = 'ok' | 'blocked_media' | 'invalid_type' | 'filename_too_long';

export type AllowedUploadType = { extension: string; mimeType: string };

/**
 * Narrows an upload to listed types and a smaller size. The error keys name the messages shown in place of the
 * general upload ones, in the common namespace the upload route and the page both translate from.
 */
export type UploadRestriction = {
  types: readonly AllowedUploadType[];
  maxBytes: number;
  wrongTypeKey: string;
  tooLargeKey: string;
};

function matchesRestriction(restriction: UploadRestriction, mime: string, ext: string): boolean {
  const allowed = restriction.types.find(type => type.extension === ext);
  return allowed !== undefined && (isUnknownMimeType(mime) || mime === allowed.mimeType);
}

export function validateFileType(
  mimetype: string,
  originalname: string,
  restriction?: UploadRestriction
): FileValidationResult {
  const ext = getFileExtensionLower(originalname);
  const mime = (mimetype || '').toLowerCase();

  if (isBlockedMedia(mime, ext)) {
    return 'blocked_media';
  }

  if (originalname.length > UPLOAD_MAX_FILENAME_LENGTH) {
    return 'filename_too_long';
  }

  if (restriction) {
    return matchesRestriction(restriction, mime, ext) ? 'ok' : 'invalid_type';
  }

  if (isAllowedMimeType(mime)) {
    return 'ok';
  }

  if (isUnknownMimeType(mime)) {
    return ALLOWED_EXTENSIONS.has(ext) ? 'ok' : 'invalid_type';
  }

  return 'invalid_type';
}

export type UploadValidationOptions = {
  maxFilenameLength?: number;
  maxDocumentBytes?: number;
  maxMediaBytes?: number;
  maxPerFileBytes?: number;
  restriction?: UploadRestriction;
};

export type UploadValidationError =
  | { kind: 'blocked_media' }
  | { kind: 'invalid_type' }
  | { kind: 'filename_too_long'; maxLength: number }
  | { kind: 'document_too_large'; maxBytes: number }
  | { kind: 'media_too_large'; maxBytes: number }
  | { kind: 'file_too_large'; maxBytes: number };

export type ValidatableFile = {
  originalname: string;
  mimetype: string;
  size: number;
};

export function validateUploadedFile(
  file: ValidatableFile,
  opts: UploadValidationOptions = {}
): UploadValidationError | null {
  const typeResult = validateFileType(file.mimetype, file.originalname, opts.restriction);
  if (typeResult === 'blocked_media') {
    return { kind: 'blocked_media' };
  }
  if (typeResult === 'invalid_type') {
    return { kind: 'invalid_type' };
  }

  if (opts.maxFilenameLength !== undefined && file.originalname.length > opts.maxFilenameLength) {
    return { kind: 'filename_too_long', maxLength: opts.maxFilenameLength };
  }

  if (opts.restriction) {
    return file.size > opts.restriction.maxBytes
      ? { kind: 'file_too_large', maxBytes: opts.restriction.maxBytes }
      : null;
  }

  const isMedia = isMediaExtension(file.originalname);
  if (isMedia && opts.maxMediaBytes !== undefined) {
    if (file.size > opts.maxMediaBytes) {
      return { kind: 'media_too_large', maxBytes: opts.maxMediaBytes };
    }
  } else if (!isMedia && opts.maxDocumentBytes !== undefined) {
    if (file.size > opts.maxDocumentBytes) {
      return { kind: 'document_too_large', maxBytes: opts.maxDocumentBytes };
    }
  } else if (opts.maxPerFileBytes !== undefined) {
    if (file.size > opts.maxPerFileBytes) {
      return { kind: 'file_too_large', maxBytes: opts.maxPerFileBytes };
    }
  }

  return null;
}

export type UploadErrorTranslation = { key: string; params?: Record<string, string | number> };

const LOCALE_PREFIX = 'errors.documentUpload';

export function bytesToMb(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

export function effectivePerFileByteLimit(opts: UploadValidationOptions | undefined): number {
  if (opts?.restriction) {
    return opts.restriction.maxBytes;
  }
  return Math.max(
    opts?.maxPerFileBytes ?? 0,
    opts?.maxDocumentBytes ?? 0,
    opts?.maxMediaBytes ?? 0,
    UPLOAD_MAX_FILE_SIZE_BYTES
  );
}

export function getUploadErrorKey(
  error: UploadValidationError,
  restriction?: UploadRestriction
): UploadErrorTranslation {
  if (restriction) {
    if (error.kind === 'blocked_media' || error.kind === 'invalid_type') {
      return { key: restriction.wrongTypeKey };
    }
    if (error.kind === 'file_too_large') {
      return { key: restriction.tooLargeKey, params: { maxSize: formatSizeForDisplay(bytesToMb(error.maxBytes)) } };
    }
  }
  switch (error.kind) {
    case 'blocked_media':
    case 'invalid_type':
      return { key: `${LOCALE_PREFIX}.wrongFileTypeDocStore` };
    case 'filename_too_long':
      return { key: `${LOCALE_PREFIX}.filenameTooLong`, params: { maxLength: error.maxLength } };
    case 'document_too_large':
      return { key: `${LOCALE_PREFIX}.fileTooLargeDocument`, params: { maxSize: bytesToMb(error.maxBytes) } };
    case 'media_too_large':
      return { key: `${LOCALE_PREFIX}.fileTooLargeMedia`, params: { maxSize: bytesToMb(error.maxBytes) } };
    case 'file_too_large':
      return { key: `${LOCALE_PREFIX}.fileTooLargeDocStore`, params: { maxSize: bytesToMb(error.maxBytes) } };
  }
}
