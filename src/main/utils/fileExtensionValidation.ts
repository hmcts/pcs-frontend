export const BLOCKED_EXTENSIONS = new Set(['.mp3', '.m4a', '.mp4', '.mpeg', '.mpg']);

export const ALLOWED_EXTENSIONS = new Set([
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

export function getFileExtensionLower(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export function isBlockedExtension(filename: string): boolean {
  return BLOCKED_EXTENSIONS.has(getFileExtensionLower(filename));
}

export function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(getFileExtensionLower(filename));
}
