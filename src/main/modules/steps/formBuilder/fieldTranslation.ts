import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import type { FormFieldConfig, FormFieldOption } from '../../../interfaces/formFieldConfig.interface';

import { buildComponentConfig } from './componentBuilders';
import { buildConditionalContent, getNestedFieldName } from './conditionalFields';
import { getTranslation, normalizeCheckboxValue } from './helpers';

export function buildFieldValues(
  fields: FormFieldConfig[],
  savedData: Record<string, unknown>,
  fieldPrefix = ''
): Record<string, unknown> {
  const fieldValues: Record<string, unknown> = {};

  for (const field of fields) {
    const fullFieldName = fieldPrefix ? `${fieldPrefix}.${field.name}` : field.name;

    if (field.type === 'checkbox') {
      // Normalize checkbox value to handle edge case: [{ '0': 'value1', '1': 'value2' }]
      // This ensures checkbox values are always in the correct format for rendering
      const value = savedData?.[fullFieldName];
      fieldValues[field.name] = normalizeCheckboxValue(value);
    } else if (field.type === 'date') {
      if (savedData?.[fullFieldName] && typeof savedData[fullFieldName] === 'object') {
        const dateValue = savedData[fullFieldName] as { day?: string; month?: string; year?: string };
        fieldValues[field.name] = {
          day: dateValue.day || '',
          month: dateValue.month || '',
          year: dateValue.year || '',
        };
      } else if (
        savedData?.[`${fullFieldName}-day`] ||
        savedData?.[`${fullFieldName}-month`] ||
        savedData?.[`${fullFieldName}-year`]
      ) {
        fieldValues[field.name] = {
          day: (savedData[`${fullFieldName}-day`] as string) || '',
          month: (savedData[`${fullFieldName}-month`] as string) || '',
          year: (savedData[`${fullFieldName}-year`] as string) || '',
        };
      } else {
        fieldValues[field.name] = { day: '', month: '', year: '' };
      }
    } else {
      // For regular fields, check both the full nested name and the simple name
      fieldValues[field.name] = savedData?.[fullFieldName] ?? savedData?.[field.name] ?? '';
    }

    // Note: subFields are handled separately in translateFields by extracting nested field values
    // from originalData. We don't merge subFields data into parent field values here because:
    // - Radio fields store a string value (the selected option)
    // - Checkbox fields store an array of selected values
    // - SubFields are extracted separately when processing options in translateFields
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
  parentFieldName?: string,
  interpolation?: Record<string, unknown>
): FormFieldOption[] {
  if (!options) {
    return [];
  }

  return options.map(option => {
    if (option.divider) {
      return option;
    }

    // Resolve label (function or string)
    const optionLabel = resolveLabel(
      option.label,
      translations,
      option.text ||
        (option.translationKey
          ? interpolation
            ? t(option.translationKey, interpolation)
            : t(option.translationKey)
          : (option.value ?? ''))
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
        const processedSubField = processField(
          subField,
          t,
          translations,
          nestedFieldName,
          parentFieldName,
          interpolation
        );
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
  parentFieldName?: string,
  interpolation?: Record<string, unknown>
): FormFieldConfig {
  const fieldName = fieldNameOverride || field.name;

  // Resolve label (function or string)
  let label = resolveLabel(
    field.label,
    translations,
    field.translationKey?.label
      ? getTranslation(t, field.translationKey.label, undefined, interpolation) || fieldName
      : fieldName
  );

  // Fallback to translation key or field name if label is still empty
  if (!label || label === fieldName) {
    label = getTranslation(t, `${fieldName}Label`, fieldName, interpolation) || fieldName;
  }

  let hint = field.hint;
  if (!hint && field.translationKey?.hint) {
    hint = getTranslation(t, field.translationKey.hint, undefined, interpolation);
  }
  if (!hint) {
    hint = getTranslation(t, `${fieldName}Hint`, undefined, interpolation);
  }

  // Process options with label functions and conditionalText
  // Pass parentFieldName so subFields can be properly prefixed
  const processedOptions = processOptions(field.options, t, translations, parentFieldName || fieldName, interpolation);

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
  fieldPrefix = '',
  originalData?: Record<string, unknown>,
  nunjucksEnv?: Environment,
  interpolation?: Record<string, unknown>
): FormFieldConfig[] {
  const translations = buildTranslationsObject(t);
  // Use originalData if provided, otherwise fall back to fieldValues
  const dataSource = originalData || fieldValues;

  return fields.map((field, index) => {
    // Process field (handles label functions)
    const processedField = processField(field, t, translations, undefined, fieldPrefix || undefined, interpolation);

    // Process subFields recursively if they exist in options
    let processedOptionsWithSubFields = processedField.options;
    if (processedField.options) {
      processedOptionsWithSubFields = processedField.options.map(option => {
        if (option.subFields) {
          // Extract nested field values for subFields from originalData
          // Look for fields with pattern "parentField.subField" in the saved data
          const subFieldValues: Record<string, unknown> = {};
          const parentFieldName = fieldPrefix ? `${fieldPrefix}.${field.name}` : field.name;

          for (const [subFieldName] of Object.entries(option.subFields)) {
            const nestedFieldName = `${parentFieldName}.${subFieldName}`;
            // Check for nested field name in originalData
            if (dataSource?.[nestedFieldName] !== undefined) {
              subFieldValues[subFieldName] = dataSource[nestedFieldName];
            }
          }

          // Recursively process subFields with proper field prefix
          const processedSubFieldsArray = translateFields(
            Object.values(option.subFields),
            t,
            subFieldValues,
            errors,
            false,
            parentFieldName, // Pass full parent field name as prefix
            originalData, // Pass originalData down for nested subFields
            nunjucksEnv, // Pass nunjucksEnv down for nested subFields
            interpolation // Pass interpolation down for nested subFields
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
    const translatedOptions = field.options?.map(option => {
      const text = option.text || (option.translationKey ? t(option.translationKey) : null) || option.value;
      const translatedOption = {
        ...option,
        ...(option.divider ? { divider: t(option.divider, option.divider) } : { text }),
      };
      return translatedOption;
    });
    // For nested fields (subFields), extract simple name to look up values
    // field.name might be nested (e.g., "parent.subField") but fieldValues is keyed by simple names
    const fieldNameForValueLookup =
      fieldPrefix && field.name.includes('.') ? field.name.split('.').pop() || field.name : field.name;

    const hasError = errors[processedField.name] !== undefined;
    const errorText = errors[processedField.name];
    // processedField.label is already resolved to a string by processField
    const resolvedLabel = typeof processedField.label === 'string' ? processedField.label : processedField.name;
    if (!nunjucksEnv) {
      throw new Error('Nunjucks environment is required for building component config');
    }

    const { component, componentType } = buildComponentConfig(
      { ...processedField, options: processedOptionsWithSubFields },
      resolvedLabel,
      processedField.hint,
      fieldValues[fieldNameForValueLookup] ?? fieldValues[processedField.name],
      translatedOptions,
      hasError || false,
      errorText,
      index,
      hasTitle,
      t,
      nunjucksEnv
    );

    return {
      ...processedField,
      options: processedOptionsWithSubFields,
      errorMessage: getTranslation(t, `errors.${field.name}`, field.errorMessage, interpolation),
      component,
      componentType,
    };
  });
}
