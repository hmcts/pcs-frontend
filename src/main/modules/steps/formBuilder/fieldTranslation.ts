import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

import { buildComponentConfig } from './componentBuilders';
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

export function translateFields(
  fields: FormFieldConfig[],
  t: TFunction,
  fieldValues: Record<string, unknown>,
  error?: { field: string; text: string },
  hasTitle = false,
  errors?: Record<string, string>
): FormFieldConfig[] {
  return fields.map((field, index) => {
    let label = field.label;
    if (!label && field.translationKey?.label) {
      label = getTranslation(t, field.translationKey.label, undefined);
    }
    if (!label) {
      label = getTranslation(t, `${field.name}Label`, field.name) || field.name;
    }

    let hint = field.hint;
    if (!hint && field.translationKey?.hint) {
      hint = getTranslation(t, field.translationKey.hint, undefined);
    }
    if (!hint) {
      hint = getTranslation(t, `${field.name}Hint`, undefined);
    }

    const translatedOptions = field.options?.map(option => {
      const text = option.text || (option.translationKey ? t(option.translationKey) : null) || option.value;
      return { ...option, text };
    });

    // Support multiple errors - prefer errors object, fall back to single error for backward compatibility
    const fieldError = errors?.[field.name] || (error && error.field === field.name ? error.text : undefined);
    const hasError = !!fieldError;
    const { component, componentType } = buildComponentConfig(
      field,
      label,
      hint,
      fieldValues[field.name],
      translatedOptions,
      hasError || false,
      fieldError,
      index,
      hasTitle,
      t
    );

    return {
      ...field,
      label,
      hint,
      errorMessage: field.errorMessage || getTranslation(t, `errors.${field.name}`, undefined),
      options: translatedOptions,
      component,
      componentType,
    };
  });
}
