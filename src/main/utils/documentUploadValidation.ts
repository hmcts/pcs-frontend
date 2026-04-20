import config from 'config';

export const UPLOAD_MAX_FILE_SIZE_MB: number = config.get('documentUpload.maxFileSizeMB');
export const UPLOAD_MAX_FILE_SIZE_BYTES = UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

const BLOCKED_MEDIA_PREFIXES = ['audio/', 'video/'] as const;

const BLOCKED_EXTENSIONS = new Set(['.mp3', '.m4a', '.mp4', '.mpeg', '.mpg']);

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

export const ACCEPT_ATTRIBUTE_EXTENSIONS = Array.from(ALLOWED_EXTENSIONS)
  .sort((a, b) => a.localeCompare(b))
  .join(',');

export function getFileExtensionLower(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export function isBlockedExtension(filename: string): boolean {
  return BLOCKED_EXTENSIONS.has(getFileExtensionLower(filename));
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

export type FileValidationResult = 'ok' | 'blocked_media' | 'invalid_type';

export function validateFileType(mimetype: string, originalname: string): FileValidationResult {
  const ext = getFileExtensionLower(originalname);
  const mime = (mimetype || '').toLowerCase();

  if (isBlockedMedia(mime, ext)) {
    return 'blocked_media';
  }

  if (isAllowedMimeType(mime)) {
    return 'ok';
  }

  if (isUnknownMimeType(mime)) {
    return ALLOWED_EXTENSIONS.has(ext) ? 'ok' : 'invalid_type';
  }

  return 'invalid_type';
}
