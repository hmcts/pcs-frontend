import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../../interfaces/stepFormData.interface';

import { validateFormWithZod } from './validation';

export function getLanguage(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).language || 'en';
}

export function getTranslation(t: TFunction, key: string, fallback?: string): string | undefined {
  const translation = t(key);
  return translation !== key ? translation : fallback;
}

export function processFieldData(req: Request, fields: FormFieldConfig[]): void {
  for (const field of fields) {
    if (field.type === 'checkbox' && req.body[field.name]) {
      if (typeof req.body[field.name] === 'string') {
        req.body[field.name] = [req.body[field.name]];
      }
    } else if (field.type === 'date') {
      const day = req.body[`${field.name}-day`]?.trim() || '';
      const month = req.body[`${field.name}-month`]?.trim() || '';
      const year = req.body[`${field.name}-year`]?.trim() || '';

      req.body[field.name] = { day, month, year };
      delete req.body[`${field.name}-day`];
      delete req.body[`${field.name}-month`];
      delete req.body[`${field.name}-year`];
    }
  }
}

export function getTranslationErrors(t: TFunction, fields: FormFieldConfig[]): Record<string, string> {
  const translationErrors: Record<string, string> = {};
  for (const field of fields) {
    const errorKey = `errors.${field.name}`;
    const errorMsg = t(errorKey);
    if (errorMsg && errorMsg !== errorKey) {
      translationErrors[field.name] = errorMsg;
    }
  }
  return translationErrors;
}

export const getFormData = (req: Request, stepName: string): StepFormData => {
  return req.session.formData?.[stepName] || {};
};

export const setFormData = (req: Request, stepName: string, data: StepFormData): void => {
  if (!req.session.formData) {
    req.session.formData = {};
  }
  req.session.formData[stepName] = data;
};

/**
 * Validate form using Zod v4 with support for function-based required rules and cross-field validation
 * Uses allFormData from session for cross-field validation
 */
export function validateForm(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>
): Record<string, string> {
  return validateFormWithZod(req, fields, translations);
}
