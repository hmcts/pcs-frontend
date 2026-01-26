import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

import { normalizeCheckboxValue } from './helpers';

/**
 * Checks if an option is selected for a radio or checkbox field
 * @param fieldValue - The current value of the field
 * @param optionValue - The value of the option to check
 * @param fieldType - The type of field ('radio' or 'checkbox')
 * @returns True if the option is selected, false otherwise
 */
export function isOptionSelected(fieldValue: unknown, optionValue: string, fieldType: 'radio' | 'checkbox'): boolean {
  if (fieldType === 'radio') {
    return fieldValue === optionValue;
  }

  if (fieldType === 'checkbox') {
    // Normalize checkbox value to handle edge case: [{ '0': 'value1', '1': 'value2' }]
    const normalizedValue = normalizeCheckboxValue(fieldValue);
    return normalizedValue.includes(optionValue);
  }

  return false;
}

/**
 * Gets subFields for a specific option if it's selected
 * @param field - The parent field configuration
 * @param optionValue - The value of the option
 * @param fieldValue - The current value of the field
 * @returns SubFields record if option is selected, undefined otherwise
 */
export function getSubFieldsForOption(
  field: FormFieldConfig,
  optionValue: string,
  fieldValue: unknown
): Record<string, FormFieldConfig> | undefined {
  if (field.type !== 'radio' && field.type !== 'checkbox') {
    return undefined;
  }

  if (!field.options) {
    return undefined;
  }

  const option = field.options.find(opt => opt.value === optionValue);
  if (!option || !option.subFields) {
    return undefined;
  }

  // Check if the option is selected
  if (!isOptionSelected(fieldValue, optionValue, field.type)) {
    return undefined;
  }

  return option.subFields;
}

/**
 * Gets all subFields that should be visible based on current field values
 * @param field - The parent field configuration
 * @param fieldValue - The current value of the field
 * @returns Record of all visible subFields keyed by their names
 */
export function getVisibleSubFields(field: FormFieldConfig, fieldValue: unknown): Record<string, FormFieldConfig> {
  const visibleSubFields: Record<string, FormFieldConfig> = {};

  if (field.type !== 'radio' && field.type !== 'checkbox') {
    return visibleSubFields;
  }

  if (!field.options) {
    return visibleSubFields;
  }

  for (const option of field.options) {
    if (option.subFields && option.value && isOptionSelected(fieldValue, option.value, field.type)) {
      // Merge subFields into visibleSubFields
      // Note: If multiple options have subFields with same names, later ones will overwrite
      // This is expected behavior - only one option can be selected for radio
      Object.assign(visibleSubFields, option.subFields);
    }
  }

  return visibleSubFields;
}

/**
 * Builds conditional content from conditionalText (string or function)
 * @param conditionalText - The conditional text (string or function)
 * @param translations - Translations object to pass to function
 * @returns The conditional text as a string
 */
export function buildConditionalContent(
  conditionalText: string | ((translations: Record<string, string>) => string) | undefined,
  translations: Record<string, string>
): string | undefined {
  if (!conditionalText) {
    return undefined;
  }

  if (typeof conditionalText === 'function') {
    return conditionalText(translations);
  }

  return conditionalText;
}

/**
 * Checks if a field should be validated (is visible/shown)
 * For nested fields, checks if parent option is selected
 * @param field - The field configuration
 * @param parentFieldName - The name of the parent field (if nested)
 * @param parentOptionValue - The value of the parent option (if nested)
 * @param formData - Current form data
 * @param allFormData - All form data from all steps
 * @returns True if field should be validated, false if hidden
 */
export function shouldValidateField(
  field: FormFieldConfig,
  parentFieldName: string | undefined,
  parentOptionValue: string | undefined,
  formData: Record<string, unknown>,
  allFormData: Record<string, unknown>
): boolean {
  // If not nested, always validate (unless required function says otherwise)
  if (!parentFieldName || !parentOptionValue) {
    return true;
  }

  // Check if parent option is selected
  const parentFieldValue = allFormData[parentFieldName] || formData[parentFieldName];

  // Find parent field to determine type
  // This is a simplified check - in practice, we'd need the parent field config
  // For now, we'll check both radio and checkbox patterns
  if (parentFieldValue === parentOptionValue) {
    return true; // Radio selected
  }

  if (Array.isArray(parentFieldValue) && parentFieldValue.includes(parentOptionValue)) {
    return true; // Checkbox selected
  }

  return false; // Parent option not selected, field is hidden
}

/**
 * Flattens nested field names for error handling
 * @param parentFieldName - The parent field name
 * @param subFieldName - The subField name
 * @returns Flattened field name (e.g., "parentField.subField")
 */
export function getNestedFieldName(parentFieldName: string, subFieldName: string): string {
  return `${parentFieldName}.${subFieldName}`;
}

/**
 * Parses a nested field name back into parent and subField names
 * @param nestedFieldName - The nested field name (e.g., "parentField.subField")
 * @returns Object with parentFieldName and subFieldName, or null if not nested
 */
export function parseNestedFieldName(nestedFieldName: string): {
  parentFieldName: string;
  subFieldName: string;
} | null {
  const parts = nestedFieldName.split('.');
  if (parts.length !== 2) {
    return null;
  }

  return {
    parentFieldName: parts[0],
    subFieldName: parts[1],
  };
}
