import type { TFunction } from 'i18next';

import type { FormFieldConfig, FormFieldOption } from '../../../interfaces/formFieldConfig.interface';

import { buildComponentConfig } from './componentBuilders';
import { buildConditionalContent, getNestedFieldName } from './conditionalFields';
import { getTranslation } from './helpers';

export function buildFieldValues(
  fields: FormFieldConfig[],
  savedData: Record<string, unknown>
): Record<string, unknown> {
  const fieldValues: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === 'checkbox') {
      if (savedData?.[field.name]) {
        const value = savedData[field.name];
        if (typeof value === 'string') {
          fieldValues[field.name] = [value];
        } else if (Array.isArray(value)) {
          fieldValues[field.name] = value;
        } else {
          fieldValues[field.name] = [];
        }
      } else {
        fieldValues[field.name] = [];
      }
    } else if (field.type === 'date') {
      if (savedData?.[field.name] && typeof savedData[field.name] === 'object') {
        const dateValue = savedData[field.name] as { day?: string; month?: string; year?: string };
        fieldValues[field.name] = {
          day: dateValue.day || '',
          month: dateValue.month || '',
          year: dateValue.year || '',
        };
      } else if (
        savedData?.[`${field.name}-day`] ||
        savedData?.[`${field.name}-month`] ||
        savedData?.[`${field.name}-year`]
      ) {
        fieldValues[field.name] = {
          day: (savedData[`${field.name}-day`] as string) || '',
          month: (savedData[`${field.name}-month`] as string) || '',
          year: (savedData[`${field.name}-year`] as string) || '',
        };
      } else {
        fieldValues[field.name] = { day: '', month: '', year: '' };
      }
    } else {
      fieldValues[field.name] = savedData?.[field.name] ?? '';
    }
  }

  return fieldValues;
}

/**
 * Builds translations object from TFunction for use in label functions
 */
function buildTranslationsObject(t: TFunction): Record<string, string> {
  const translations: Record<string, string> = {};

  // Extract all translations from i18next store
  // Note: TFunction type doesn't include store, but it exists at runtime
  const tWithStore = t as TFunction & { store?: { data?: Record<string, Record<string, Record<string, unknown>>> } };
  if (tWithStore.store?.data) {
    for (const lang of Object.keys(tWithStore.store.data)) {
      for (const ns of Object.keys(tWithStore.store.data[lang] || {})) {
        const nsData = tWithStore.store.data[lang][ns];
        if (nsData && typeof nsData === 'object') {
          for (const [key, value] of Object.entries(nsData)) {
            if (typeof value === 'string') {
              translations[key] = value;
            }
          }
        }
      }
    }
  }

  return translations;
}

/**
 * Resolves a label (string or function) to a string
 */
function resolveLabel(
  label: string | ((translations: Record<string, string>) => string) | undefined,
  translations: Record<string, string>,
  fallback: string
): string {
  if (!label) {
    return fallback;
  }

  if (typeof label === 'function') {
    return label(translations);
  }

  return label;
}

/**
 * Processes options with label functions, conditionalText, and subFields
 */
function processOptions(
  options: FormFieldOption[] | undefined,
  t: TFunction,
  translations: Record<string, string>,
  parentFieldName?: string
): FormFieldOption[] {
  if (!options) {
    return [];
  }

  return options.map(option => {
    // Resolve label (function or string)
    const optionLabel = resolveLabel(
      option.label,
      translations,
      option.text || (option.translationKey ? t(option.translationKey) : option.value)
    );

    // Process conditionalText if provided
    let resolvedConditionalText: string | undefined;
    if (option.conditionalText) {
      resolvedConditionalText = buildConditionalContent(option.conditionalText, translations);
    }

    // Process subFields recursively if they exist
    // SubFields need to have their names prefixed with the parent field name
    let processedSubFields: Record<string, FormFieldConfig> | undefined;
    if (option.subFields && parentFieldName) {
      processedSubFields = {};
      for (const [subFieldName, subField] of Object.entries(option.subFields)) {
        // Create nested field name: parentField.subField
        const nestedFieldName = getNestedFieldName(parentFieldName, subFieldName);
        const processedSubField = processField(subField, t, translations, nestedFieldName, parentFieldName);
        // Store with original subFieldName as key for template access, but field has nested name
        processedSubFields[subFieldName] = processedSubField;
      }
    }

    return {
      ...option,
      text: optionLabel,
      conditionalText: resolvedConditionalText,
      subFields: processedSubFields,
    };
  });
}

/**
 * Processes a single field (recursive for subFields)
 */
function processField(
  field: FormFieldConfig,
  t: TFunction,
  translations: Record<string, string>,
  fieldNameOverride?: string,
  parentFieldName?: string
): FormFieldConfig {
  const fieldName = fieldNameOverride || field.name;

  // Resolve label (function or string)
  let label = resolveLabel(
    field.label,
    translations,
    field.translationKey?.label ? getTranslation(t, field.translationKey.label, undefined) || fieldName : fieldName
  );

  // Fallback to translation key or field name if label is still empty
  if (!label || label === fieldName) {
    label = getTranslation(t, `${fieldName}Label`, fieldName) || fieldName;
  }

  let hint = field.hint;
  if (!hint && field.translationKey?.hint) {
    hint = getTranslation(t, field.translationKey.hint, undefined);
  }
  if (!hint) {
    hint = getTranslation(t, `${fieldName}Hint`, undefined);
  }

  // Process options with label functions and conditionalText
  // Pass parentFieldName so subFields can be properly prefixed
  const processedOptions = processOptions(field.options, t, translations, parentFieldName || fieldName);

  return {
    ...field,
    name: fieldName,
    label,
    hint,
    options: processedOptions,
  };
}

export function translateFields(
  fields: FormFieldConfig[],
  t: TFunction,
  fieldValues: Record<string, unknown>,
  errors: Record<string, string> = {},
  hasTitle = false,
  fieldPrefix = ''
): FormFieldConfig[] {
  const translations = buildTranslationsObject(t);

  return fields.map((field, index) => {
    // Process field (handles label functions)
    const processedField = processField(field, t, translations, undefined, fieldPrefix || undefined);

    // Process subFields recursively if they exist in options
    let processedOptionsWithSubFields = processedField.options;
    if (processedField.options) {
      processedOptionsWithSubFields = processedField.options.map(option => {
        if (option.subFields) {
          // Get field values for subFields (nested under parent field name)
          const parentFieldValue = fieldValues[field.name] as Record<string, unknown> | undefined;
          const subFieldValues = parentFieldValue || {};

          // Recursively process subFields with proper field prefix
          const processedSubFieldsArray = translateFields(
            Object.values(option.subFields),
            t,
            subFieldValues,
            errors,
            false,
            field.name // Pass parent field name as prefix
          );

          // Convert back to Record format with original subField names as keys
          const processedSubFields: Record<string, FormFieldConfig> = {};
          for (const processedSubField of processedSubFieldsArray) {
            // Extract original subField name from nested name (e.g., "parent.subField" -> "subField")
            const subFieldName = processedSubField.name.includes('.')
              ? processedSubField.name.split('.').pop() || processedSubField.name
              : processedSubField.name;
            processedSubFields[subFieldName] = processedSubField;
          }

          return {
            ...option,
            subFields: processedSubFields,
          };
        }
        return option;
      });
    }

    // Build translated options for component builder (backward compatible format)
    const translatedOptions = processedOptionsWithSubFields?.map(option => ({
      value: option.value,
      text: option.text || option.value,
    }));

    const hasError = errors[field.name] !== undefined;
    const errorText = errors[field.name];
    // processedField.label is already resolved to a string by processField
    const resolvedLabel = typeof processedField.label === 'string' ? processedField.label : field.name;
    const { component, componentType } = buildComponentConfig(
      { ...processedField, options: processedOptionsWithSubFields },
      resolvedLabel,
      processedField.hint,
      fieldValues[field.name],
      translatedOptions,
      hasError || false,
      errorText,
      index,
      hasTitle,
      t
    );

    return {
      ...processedField,
      options: processedOptionsWithSubFields,
      errorMessage: field.errorMessage || getTranslation(t, `errors.${field.name}`, undefined),
      component,
      componentType,
    };
  });
}
