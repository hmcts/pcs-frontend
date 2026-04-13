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

export function handleFileUploadDelete(req: Request, stepName: string, fields: FormFieldConfig[], deleteId: string): void {
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
      translations?.[`${fileFields[0].name}.selectFile`] ||
      t('errors.fileUpload.selectFile', 'Select a file');
    return errors;
  }

  for (const field of withIncoming) {
    const incoming = getMulterFilesForField(req, field.name);

    for (const file of incoming) {
      if (!isAllowedUploadFilename(file.originalname)) {
        errors[field.name] =
          translations?.[`${field.name}.invalidFileType`] ||
          t('errors.fileUpload.invalidFileType', FILE_TYPE_ERROR_FALLBACK);
        break;
      }
      if (isFileTooLarge(file)) {
        errors[field.name] =
          translations?.[`${field.name}.fileTooLarge`] ||
          t('errors.fileUpload.fileTooLarge', FILE_TOO_LARGE_ERROR_FALLBACK);
        break;
      }
    }

    if (errors[field.name]) {
      continue;
    }

    const saved = getSavedUploadFiles(req, stepName, field.name);
    if (field.fileUploadSingleOnly && (saved.length > 0 || incoming.length > 1)) {
      errors[field.name] =
        translations?.[`${field.name}.tooMany`] ||
        t('errors.fileUpload.singleFileOnly', 'You can only upload one file');
      continue;
    }

    const newMetas = buildFileMetasFromMulter(incoming);
    setSavedUploadFiles(req, stepName, field.name, [...saved, ...newMetas]);
  }

  return errors;
}
