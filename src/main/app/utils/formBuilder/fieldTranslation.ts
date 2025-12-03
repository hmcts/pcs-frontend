import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { TranslationContent } from '../i18n';

import { buildComponentConfig } from './componentBuilders';

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
    } else if (field.type === 'textarea' || field.type === 'character-count') {
      fieldValues[field.name] = savedData?.[field.name] ?? '';
    } else {
      fieldValues[field.name] = savedData?.[field.name] ?? '';
    }
  }

  return fieldValues;
}

export function translateFields(
  fields: FormFieldConfig[],
  translations: TranslationContent,
  fieldValues: Record<string, unknown>,
  error?: { field: string; text: string },
  hasTitle = false
): FormFieldConfig[] {
  const errors = (translations.errors as Record<string, string>) || {};

  return fields.map((field, index) => {
    // Translate label
    let label = field.label;
    if (!label && field.translationKey?.label) {
      label = (translations[field.translationKey.label] as string) || undefined;
    }
    if (!label) {
      const labelKey = `${field.name}Label`;
      label = (translations[labelKey] as string) || field.name;
    }

    // Translate hint
    let hint = field.hint;
    if (!hint && field.translationKey?.hint) {
      hint = (translations[field.translationKey.hint] as string) || undefined;
    }
    if (!hint) {
      const hintKey = `${field.name}Hint`;
      hint = (translations[hintKey] as string) || undefined;
    }

    // Translate options
    const translatedOptions = field.options?.map(option => {
      let text = option.text;
      if (!text && option.translationKey) {
        const keys = option.translationKey.split('.');
        let value: unknown = translations;
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
          } else {
            value = undefined;
            break;
          }
        }
        text = (typeof value === 'string' ? value : undefined) || option.value;
      } else if (!text) {
        text = option.value;
      }
      return {
        ...option,
        text,
      };
    });

    const errorMessage = field.errorMessage || errors[field.name];
    const hasError = error && error.field === field.name;

    // Build component configuration
    const { component, componentType } = buildComponentConfig(
      field,
      label,
      hint,
      fieldValues[field.name],
      translatedOptions,
      hasError || false,
      error?.text,
      index,
      hasTitle,
      translations
    );

    return {
      ...field,
      label,
      hint,
      errorMessage,
      options: translatedOptions,
      component,
      componentType,
    };
  });
}
