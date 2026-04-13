import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

import {
  FILE_TOO_LARGE_ERROR_FALLBACK,
  FILE_TYPE_ERROR_FALLBACK,
  buildFileMetasFromMulter,
  getSavedUploadFiles,
  isAllowedUploadFilename,
  isFileTooLarge,
  setSavedUploadFiles,
} from './fileUpload';
import { getMulterFilesForField } from './helpers';

export function handleFileUploadDelete(
  req: Request,
  stepName: string,
  fields: FormFieldConfig[],
  deleteId: string
): void {
  for (const field of fields) {
    if (field.type !== 'file') {
      continue;
    }
    const saved = getSavedUploadFiles(req, stepName, field.name);
    const next = saved.filter(f => f.id !== deleteId);
    if (next.length !== saved.length) {
      setSavedUploadFiles(req, stepName, field.name, next);
      return;
    }
  }
}

function validateFileTypes(
  files: Express.Multer.File[],
  fieldName: string,
  t: TFunction,
  translations?: Record<string, string>
): string | null {
  for (const file of files) {
    if (!isAllowedUploadFilename(file.originalname)) {
      return (
        translations?.[`${fieldName}.invalidFileType`] ||
        t('errors.fileUpload.invalidFileType', FILE_TYPE_ERROR_FALLBACK)
      );
    }
  }
  return null;
}

function validateFileSizes(
  files: Express.Multer.File[],
  fieldName: string,
  t: TFunction,
  translations?: Record<string, string>
): string | null {
  for (const file of files) {
    if (isFileTooLarge(file)) {
      return (
        translations?.[`${fieldName}.fileTooLarge`] ||
        t('errors.fileUpload.fileTooLarge', FILE_TOO_LARGE_ERROR_FALLBACK)
      );
    }
  }
  return null;
}

function validateSingleFileConstraint(
  field: FormFieldConfig,
  savedCount: number,
  incomingCount: number,
  t: TFunction,
  translations?: Record<string, string>
): string | null {
  if (field.fileUploadSingleOnly && (savedCount > 0 || incomingCount > 1)) {
    return (
      translations?.[`${field.name}.tooMany`] || t('errors.fileUpload.singleFileOnly', 'You can only upload one file')
    );
  }
  return null;
}

/**
 * Validates files submitted via MOJ "Upload file" and appends metadata to session.
 */
export function validateAndAppendFileUploads(
  req: Request,
  stepName: string,
  fields: FormFieldConfig[],
  t: TFunction,
  translations?: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fileFields = fields.filter(f => f.type === 'file');

  if (fileFields.length === 0) {
    return errors;
  }

  const withIncoming = fileFields.filter(f => getMulterFilesForField(req, f.name).length > 0);

  if (withIncoming.length === 0) {
    errors[fileFields[0].name] =
      translations?.[`${fileFields[0].name}.selectFile`] || t('errors.fileUpload.selectFile', 'Select a file');
    return errors;
  }

  for (const field of withIncoming) {
    const incoming = getMulterFilesForField(req, field.name);

    const typeError = validateFileTypes(incoming, field.name, t, translations);
    if (typeError) {
      errors[field.name] = typeError;
      continue;
    }

    const sizeError = validateFileSizes(incoming, field.name, t, translations);
    if (sizeError) {
      errors[field.name] = sizeError;
      continue;
    }

    const saved = getSavedUploadFiles(req, stepName, field.name);
    const constraintError = validateSingleFileConstraint(field, saved.length, incoming.length, t, translations);
    if (constraintError) {
      errors[field.name] = constraintError;
      continue;
    }

    const newMetas = buildFileMetasFromMulter(incoming);
    setSavedUploadFiles(req, stepName, field.name, [...saved, ...newMetas]);
  }

  return errors;
}
