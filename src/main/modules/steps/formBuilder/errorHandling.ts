import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

export interface ErrorSummaryItem {
  text: string;
  href: string;
}

export interface ErrorSummary {
  titleText: string;
  errorList: ErrorSummaryItem[];
}

export interface FieldError {
  field: string;
  anchor?: string;
  text: string;
}

/**
 * Build error summary object for GOV.UK Error Summary component
 */
export function buildErrorSummary(
  errors: Record<string, string>,
  fields: FormFieldConfig[],
  t?: TFunction
): ErrorSummary | null {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  const errorList: ErrorSummaryItem[] = [];
  const fieldMap = new Map(fields.map(f => [f.name, f]));

  for (const [fieldName, errorMessage] of Object.entries(errors)) {
    const field = fieldMap.get(fieldName);
    let anchorId = fieldName;

    // Handle date fields - anchor to day field
    if (field?.type === 'date') {
      anchorId = `${fieldName}-day`;
    }

    // Handle radio/checkbox fields - anchor to field name
    if (field?.type === 'radio' || field?.type === 'checkbox') {
      anchorId = fieldName;
    }

    errorList.push({
      text: errorMessage,
      href: `#${anchorId}`,
    });
  }

  if (errorList.length === 0) {
    return null;
  }

  const titleText = t ? t('errors.title') : 'There is a problem';

  return {
    titleText: titleText || 'There is a problem',
    errorList,
  };
}

/**
 * Standard error rendering function
 * Renders a view with error summary and field-level errors
 */
export function renderWithErrors(
  req: Request,
  res: Response,
  errors: Record<string, string>,
  content: Record<string, unknown>,
  viewPath: string,
  fields: FormFieldConfig[],
  t?: TFunction
): Response {
  const errorSummary = buildErrorSummary(errors, fields, t);

  // Use error from content if it exists (it may have anchor property), otherwise create one
  const errorFromContent = content.error as FieldError | undefined;
  const firstField = Object.keys(errors)[0];
  const firstError: FieldError | undefined =
    errorFromContent ||
    (firstField
      ? {
          field: firstField,
          text: errors[firstField],
        }
      : undefined);

  res.status(400).render(viewPath, {
    ...content,
    errors,
    errorSummary,
    error: firstError, // Keep for backward compatibility
  });

  return res;
}
