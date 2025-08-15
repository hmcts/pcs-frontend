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
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>,
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

    // Date component errors (day/month/year) first
    let pushedSpecific = false;
    (['day', 'month', 'year'] as const).forEach(part => {
      const partMessage = (error as Record<string, string | undefined>)[part];
      if (partMessage) {
        pushedSpecific = true;
        errorList.push({
          text: tx(String(partMessage)),
          href: `#${fieldName}-${part}`,
        });
      }
    });

    // Generic (non-part) message
    if (!pushedSpecific) {
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
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>,
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
