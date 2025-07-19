import type { FieldConfig } from './schema';

export interface ProcessedError {
  text: string;
  href: string;
}

export interface ErrorSummaryData {
  titleText: string;
  errorList: ProcessedError[];
}

/**
 * Processes validation errors into a format suitable for the GOV.UK Error Summary component
 * @param errors - Validation errors from the journey validator
 * @returns Error summary data for template rendering
 */
export function processErrorsForTemplate(
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>
): ErrorSummaryData | null {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  const errorList: ProcessedError[] = [];

  for (const [fieldName, error] of Object.entries(errors)) {
    const anchorId = error.anchor || fieldName;
    errorList.push({
      text: error.message,
      href: `#${anchorId}`,
    });
  }

  return {
    titleText: 'There is a problem',
    errorList,
  };
}

/**
 * Processes field configuration to add error messages for GOV.UK components
 * @param fieldConfig - The field configuration
 * @param fieldName - The name of the field
 * @param errors - Validation errors
 * @returns Updated field configuration with error message
 */
export function addErrorMessageToField(
  fieldConfig: FieldConfig,
  fieldName: string,
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>
): FieldConfig {
  const fieldError = errors && errors[fieldName];

  if (fieldError) {
    return {
      ...fieldConfig,
      errorMessage: { text: String(fieldError.message) },
    };
  }

  return fieldConfig;
}
