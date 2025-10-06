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
 * Processes validation errors into GOV.UK Error Summary format, with i18n.
 * @param errors - Validation errors from the journey validator
 * @param step   - Current step (for field types)
 * @param t      - Translator: (key) => string
 */
export function processErrorsForTemplate(
  errors?: Record<
    string,
    { day?: string; month?: string; year?: string; message: string; anchor?: string; _fieldOnly?: boolean }
  >,
  step?: { fields?: Record<string, { type: string }> },
  t?: (key: unknown) => string
): ErrorSummaryData | null {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  const tx = (s: string) => (t ? t(s) : s);

  const errorList: ProcessedError[] = [];

  for (const [fieldName, error] of Object.entries(errors)) {
    const type = step?.fields?.[fieldName]?.type;

    // Skip field-only errors (these are for field-level display, not summary)
    if (error._fieldOnly) {
      continue;
    }

    // Check if this is a part-specific error (e.g., fieldName-day, fieldName-month)
    const isPartError = fieldName.includes('-') && ['day', 'month', 'year'].includes(fieldName.split('-').pop() || '');

    if (isPartError) {
      // This is a part-specific error, add it to the summary
      errorList.push({
        text: tx(error.message),
        href: `#${error.anchor || fieldName}`,
      });
    } else {
      // This is a whole field error
      // For date fields, check if there are any part-specific errors
      const hasPartErrors =
        type === 'date' &&
        Object.keys(errors).some(
          key => key.startsWith(`${fieldName}-`) && ['day', 'month', 'year'].includes(key.split('-').pop() || '')
        );

      // Only add whole field error to summary if there are no part-specific errors
      if (!hasPartErrors) {
        let anchorId: string;
        if (error.anchor) {
          anchorId = error.anchor; // validator may provide a precise target
        } else if (type === 'date') {
          anchorId = `${fieldName}-day`;
        } else if (type === 'radios' || type === 'checkboxes') {
          // group-level anchor (GOV.UK radios/checkboxes use the field id on the container)
          anchorId = fieldName;
        } else {
          anchorId = fieldName;
        }

        errorList.push({
          text: tx(error.message),
          href: `#${anchorId}`,
        });
      }
    }
  }

  // If no errors to show in summary, return null
  if (errorList.length === 0) {
    return null;
  }

  return {
    titleText: tx('errors.title') || 'There is a problem',
    errorList,
  };
}

/**
 * Attach a field-level errorMessage (component-level), with i18n.
 */
export function addErrorMessageToField(
  fieldConfig: FieldConfig,
  fieldName: string,
  errors?: Record<
    string,
    { day?: string; month?: string; year?: string; message: string; anchor?: string; _fieldOnly?: boolean }
  >,
  t?: (key: unknown) => string
): FieldConfig {
  const fieldError = errors && errors[fieldName];
  if (!fieldError) {
    return fieldConfig;
  }

  const tx = (s: string) => (t ? t(s) : s);

  return {
    ...fieldConfig,
    errorMessage: { text: tx(String(fieldError.message)) },
  };
}
