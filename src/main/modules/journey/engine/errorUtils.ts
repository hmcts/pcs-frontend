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
    // Add part-specific error messages (day/month/year) first so each invalid component is listed
    let hasSpecific = false;
    (['day', 'month', 'year'] as const).forEach(part => {
      const partMessage = (error as Record<string, string | undefined>)[part];
      if (partMessage) {
        hasSpecific = true;
        errorList.push({
          text: String(partMessage),
          href: `#${fieldName}-${part}`,
        });
      }
    });

    // if generic error, target the first input
    if (!hasSpecific) {

      errorList.push({
        text: error.message,
        href: `#${fieldName}-day`,
      });
    }
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
