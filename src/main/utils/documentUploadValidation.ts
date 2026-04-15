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
