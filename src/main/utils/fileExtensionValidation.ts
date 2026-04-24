export const BLOCKED_EXTENSIONS = new Set(['.mp3', '.m4a', '.mp4', '.mpeg', '.mpg']);

export function getFileExtensionLower(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export function isBlockedExtension(filename: string): boolean {
  return BLOCKED_EXTENSIONS.has(getFileExtensionLower(filename));
}
