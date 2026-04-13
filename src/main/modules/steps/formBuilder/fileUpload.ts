import { randomUUID } from 'crypto';

import type { Request } from 'express';
import multer from 'multer';

export type SavedUploadFileMeta = {
  id: string;
  file_name: string;
  content_type: string;
  size: number;
  /** Placeholder until document service integration */
  url: string;
  binaryUrl?: string;
};

export const ALLOWED_FILE_EXTENSIONS = new Set([
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

export const DEFAULT_FILE_ACCEPT = Array.from(ALLOWED_FILE_EXTENSIONS).join(',');

/** Fallback used when the translation key `errors.fileUpload.invalidFileType` is unavailable. */
export const FILE_TYPE_ERROR_FALLBACK =
  'The selected file must be a DOC/DOT/DOCX/DOTX, XLS/XLT/XLA/XLSX/XLTX/XLSB, PPT/POT/PPS/PPA/PPTX/POTX/PPSX, PDF, TXT/RTF/CSV, JPG/JPEG, PNG, BMP, TIF/TIFF';

export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1024MB
export const MAX_FILE_SIZE_DISPLAY = '1024MB';

export const FILE_TOO_LARGE_ERROR_FALLBACK = `The selected file must be smaller than ${MAX_FILE_SIZE_DISPLAY}`;

export function isFileTooLarge(file: Express.Multer.File): boolean {
  return file.size > MAX_FILE_SIZE_BYTES;
}

// Get the file extension from the filename
export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

// Check if the file extension is allowed
export function isAllowedUploadFilename(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext !== '' && ALLOWED_FILE_EXTENSIONS.has(ext);
}

// Generate the session key for saved files
export function savedFilesSessionKey(fieldName: string): string {
  return `${fieldName}SavedFiles`;
}

// Get the saved upload files from session
export function getSavedUploadFiles(req: Request, stepName: string, fieldName: string): SavedUploadFileMeta[] {
  const stepData = req.session.formData?.[stepName];
  if (!stepData || typeof stepData !== 'object') {
    return [];
  }
  const key = savedFilesSessionKey(fieldName);
  const raw = (stepData as Record<string, unknown>)[key];
  return Array.isArray(raw) ? (raw as SavedUploadFileMeta[]) : [];
}

// Set the saved upload files in session
export function setSavedUploadFiles(
  req: Request,
  stepName: string,
  fieldName: string,
  files: SavedUploadFileMeta[]
): void {
  if (!req.session.formData) {
    req.session.formData = {};
  }
  if (!req.session.formData[stepName]) {
    req.session.formData[stepName] = {};
  }
  (req.session.formData[stepName] as Record<string, unknown>)[savedFilesSessionKey(fieldName)] = files;
}

// Build file metadata from multer files
export function buildFileMetasFromMulter(files: Express.Multer.File[]): SavedUploadFileMeta[] {
  return files.map(f => ({
    id: randomUUID(),
    file_name: f.originalname,
    content_type: f.mimetype,
    size: f.size,
    url: '',
  }));
}

// Create memory storage for multer
const memoryStorage = multer.memoryStorage();

// Create multer instance with memory storage and file size limit
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/**
 * Parses multipart/form-data into `req.body` and `req.files` for form steps with file fields.
 */
export const multipartFormDataParser = upload.any();
