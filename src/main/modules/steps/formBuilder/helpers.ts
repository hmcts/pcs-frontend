import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../../interfaces/stepFormData.interface';

import { getNestedFieldName, isOptionSelected } from './conditionalFields';
import { getDateTranslationKey, validateDateField } from './dateValidation';
import type { FormError } from './errorUtils';

export { validateCurrencyAmount } from './currencyValidation';

const logger = Logger.getLogger('form-builder-helpers');

export function getTranslation(
  t: TFunction,
  key: string,
  fallback?: string,
  interpolation?: Record<string, unknown>
): string | undefined {
  const options = { returnObjects: true, ...interpolation };
  const result = t(key, options) as unknown;
  if (typeof result === 'string' && result !== key && !result.includes('returned an object instead of string')) {
    return result;
  }
  return fallback;
}

/**
 * Normalizes a single checkbox field value to an array
 * Handles string, array, and other value types consistently
 * Also handles edge case where arrays contain objects with numeric keys: [{ '0': 'value1', '1': 'value2' }]
 */
export function normalizeCheckboxValue(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    // Handle edge case: array containing object(s) with numeric keys
    // e.g., [{ '0': 'value1', '1': 'value2' }] or [{ '0': 'value1' }, { '0': 'value2' }]
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
      const extractedValues: string[] = [];
      for (const item of value) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Extract all values from object with numeric keys
          const objValues = Object.values(item).filter(v => typeof v === 'string') as string[];
          extractedValues.push(...objValues);
        } else if (typeof item === 'string') {
          extractedValues.push(item);
        }
      }
      return extractedValues.length > 0 ? extractedValues : [];
    }
    // Normal array of strings
    return value.filter(v => typeof v === 'string') as string[];
  }
  // Handle edge case where value exists but is not string or array
  return [value as string];
}

/**
 * Normalizes checkbox values to arrays before validation
 * This must run before validation because validation functions (like required functions)
 * need normalized checkbox arrays to work correctly
 */
export function normalizeCheckboxFields(req: Request, fields: FormFieldConfig[]): void {
  for (const field of fields) {
    if (field.type === 'checkbox') {
      // Always normalize checkbox values to arrays, even if they don't exist yet
      // This ensures consistent handling in production vs development
      req.body[field.name] = normalizeCheckboxValue(req.body[field.name]);
    }
  }
}

/**
 * Processes all field data (checkbox normalization + date field consolidation)
 * This should run AFTER validation because date field validation expects individual day/month/year keys
 */
export function processFieldData(req: Request, fields: FormFieldConfig[]): void {
  for (const field of fields) {
    if (field.type === 'checkbox') {
      // Normalize checkbox values (in case they weren't normalized before validation)
      req.body[field.name] = normalizeCheckboxValue(req.body[field.name]);
    } else if (field.type === 'date') {
      const day = req.body[`${field.name}-day`]?.trim() || '';
      const month = req.body[`${field.name}-month`]?.trim() || '';
      const year = req.body[`${field.name}-year`]?.trim() || '';

      req.body[field.name] = { day, month, year };
      delete req.body[`${field.name}-day`];
      delete req.body[`${field.name}-month`];
      delete req.body[`${field.name}-year`];
    }
  }
}

export function getTranslationErrors(
  t: TFunction,
  fields: FormFieldConfig[],
  parentFieldName?: string,
  interpolation?: Record<string, unknown>
): Record<string, string> {
  const translationErrors: Record<string, string> = {};

  const getStringTranslation = (key: string): string | undefined => {
    // Ask for objects so we can detect object-valued keys safely
    // Pass interpolation values if provided
    const options = { returnObjects: true, ...interpolation };
    const result = t(key, options) as unknown;
    return typeof result === 'string' && result !== key ? result : undefined;
  };

  for (const field of fields) {
    // Get the nested field name if this is a subField
    const fieldName = parentFieldName ? getNestedFieldName(parentFieldName, field.name) : field.name;

    // For subFields, prioritize field.errorMessage (which is usually 'errors.subFieldName')
    // For top-level fields, check both the nested name and errorMessage property
    if (parentFieldName && field.errorMessage) {
      // If errorMessage is a translation key (starts with 'errors.'), translate it
      if (typeof field.errorMessage === 'string' && field.errorMessage.startsWith('errors.')) {
        const subFieldErrorKey = field.errorMessage;
        const subFieldErrorMsg = getStringTranslation(field.errorMessage);
        if (subFieldErrorMsg && subFieldErrorMsg !== subFieldErrorKey) {
          // Use nested field name as the key (e.g., 'contactMethod.emailAddress')
          translationErrors[fieldName] = subFieldErrorMsg;
        } else {
          // Debug: translation not found
          logger.debug(
            `Translation not found for key "${subFieldErrorKey}" for subField "${fieldName}". Translation returned: "${subFieldErrorMsg}"`
          );
        }
      }
    } else {
      // For top-level fields, check error message translation using the field name
      // Prefer flat string keys (errors.<field>) used across the service.
      const errorKey = `errors.${field.name}`;
      const errorMsg = getStringTranslation(errorKey);
      if (errorMsg) {
        translationErrors[field.name] = errorMsg;
      }

      // Also check the errorMessage property if set
      if (field.errorMessage && typeof field.errorMessage === 'string' && field.errorMessage.startsWith('errors.')) {
        const errorMsgFromProperty = interpolation ? t(field.errorMessage, interpolation) : t(field.errorMessage);
        if (errorMsgFromProperty && errorMsgFromProperty !== field.errorMessage) {
          translationErrors[field.name] = errorMsgFromProperty;
        }
      }
    }

    // Recursively process subFields if this is a radio/checkbox field
    if ((field.type === 'radio' || field.type === 'checkbox') && field.options) {
      for (const option of field.options) {
        if (option.subFields) {
          // Recursively collect error translations from subFields
          // Pass the current fieldName (which may already be nested) as the parent
          // But we need to use the simple field.name for the parent, not fieldName
          const subFieldErrors = getTranslationErrors(t, Object.values(option.subFields), field.name, interpolation);
          Object.assign(translationErrors, subFieldErrors);
        }
      }
    }
  }

  return translationErrors;
}

export function getCustomErrorTranslations(t: TFunction, fields: FormFieldConfig[]): Record<string, string> {
  const stepSpecificErrors: Record<string, string> = {};
  const nestedKeys = ['required', 'custom', 'missingOne', 'missingTwo', 'futureDate'];

  for (const field of fields) {
    for (const nestedKey of nestedKeys) {
      const nestedErrorKey = `errors.${field.name}.${nestedKey}`;
      const nestedError = t(nestedErrorKey);
      if (nestedError && nestedError !== nestedErrorKey) {
        if (field.type === 'date') {
          const dateKey = getDateTranslationKey(nestedKey);
          if (dateKey) {
            stepSpecificErrors[dateKey] = nestedError;
          }
        }
        stepSpecificErrors[`${field.name}.${nestedKey}`] = nestedError;
      }
    }
  }

  return stepSpecificErrors;
}

export const getFormData = (req: Request, stepName: string): StepFormData => {
  return req.session.formData?.[stepName] || {};
};

export const setFormData = (req: Request, stepName: string, data: StepFormData): void => {
  if (!req.session.formData) {
    req.session.formData = {};
  }
  req.session.formData[stepName] = data;
};

export function validateForm(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>,
  allFormData?: Record<string, unknown>,
  t?: TFunction
): Record<string, FormError> {
  const errors: Record<string, FormError> = {};
  // Build formData from current request body (before processing date fields)
  const formData: Record<string, unknown> = { ...req.body };

  // Merge allFormData if provided, otherwise get from session
  const mergedAllData: Record<string, unknown> =
    allFormData ||
    (req.session.formData
      ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
      : {});

  // Merge current form data into all data for validation context
  const validationAllData = { ...mergedAllData, ...formData };

  // Helper function to validate a single field (including nested subFields)
  const validateField = (field: FormFieldConfig, parentFieldName?: string, parentOptionValue?: string): void => {
    // Check if field should be validated (is visible)
    // For nested fields, check if parent option is selected
    if (parentFieldName && parentOptionValue) {
      const parentValue = formData[parentFieldName] || validationAllData[parentFieldName];
      const parentField = fields.find(f => f.name === parentFieldName);
      const fieldType = parentField?.type === 'checkbox' ? 'checkbox' : 'radio';

      if (!isOptionSelected(parentValue, parentOptionValue, fieldType)) {
        // Field is hidden, skip validation
        return;
      }
    }

    // Evaluate required function if it's a function
    let isRequired = false;
    if (field.required !== undefined) {
      if (typeof field.required === 'function') {
        try {
          isRequired = field.required(formData, validationAllData);
        } catch (err) {
          logger.error(`Error evaluating required function for field ${field.name}:`, err);
          isRequired = false;
        }
      } else {
        isRequired = field.required;
      }
    }

    // Get field value - handle nested field names
    const fieldName = parentFieldName ? getNestedFieldName(parentFieldName, field.name) : field.name;
    let value: unknown;

    if (parentFieldName) {
      // For nested fields, check if parent field value contains subField data
      const parentValue = formData[parentFieldName];
      // Check if parentValue is a plain object (not an array) that might contain subField data
      // Arrays are objects in JavaScript, so we need to exclude them explicitly
      if (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue)) {
        value = (parentValue as Record<string, unknown>)[field.name];
      }
      // If value is still undefined, try direct access with nested name
      if (value === undefined) {
        value = req.body[fieldName] || formData[fieldName];
      }
    } else {
      value = req.body[field.name];
    }

    if (field.type === 'date') {
      const dayKey = parentFieldName ? `${parentFieldName}-${field.name}-day` : `${field.name}-day`;
      const monthKey = parentFieldName ? `${parentFieldName}-${field.name}-month` : `${field.name}-month`;
      const yearKey = parentFieldName ? `${parentFieldName}-${field.name}-year` : `${field.name}-year`;

      const day = req.body[dayKey]?.trim() || '';
      const month = req.body[monthKey]?.trim() || '';
      const year = req.body[yearKey]?.trim() || '';

      const dateError = validateDateField(day, month, year, isRequired, t, field.noFutureDate, translations);
      if (dateError) {
        errors[fieldName] = dateError;
      }

      const dateValue = { day, month, year };

      // Run validator function if provided
      if (field.validator && value !== undefined && !errors[fieldName]) {
        try {
          const validatorResult = field.validator(dateValue, formData, validationAllData);
          if (validatorResult !== true) {
            const errorMsg = typeof validatorResult === 'string' ? validatorResult : 'Invalid date';
            if (!errors[fieldName]) {
              errors[fieldName] = errorMsg;
            }
          }
        } catch (err) {
          logger.error(`Error running validator function for field ${field.name}:`, err);
        }
      }

      // Run validate function if provided
      if (field.validate && !errors[fieldName]) {
        try {
          const customError = field.validate(dateValue, formData, validationAllData);
          if (customError) {
            errors[fieldName] = customError.startsWith('errors.')
              ? translations?.[customError.replace('errors.', '')] || customError
              : customError;
          }
        } catch (err) {
          logger.error(`Error running validate function for field ${field.name}:`, err);
        }
      }
    } else {
      const isMissing =
        field.type === 'checkbox'
          ? !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && !value.trim())
          : value === undefined || value === null || value === '';

      if (isRequired && isMissing) {
        // Check translations first (which contains translated errorMessage), then field.errorMessage, then defaults
        // field.errorMessage can be either a translation key or a direct message
        errors[fieldName] =
          translations?.[fieldName] || field.errorMessage || translations?.defaultRequired || 'This field is required';
      }

      // Run validator function if provided (field-level validation)
      if (field.validator && value !== undefined && value !== null && value !== '') {
        try {
          const validatorResult = field.validator(value, formData, validationAllData);
          if (validatorResult !== true) {
            // Use translated error message if available, otherwise use validator result or default
            // Don't use field.errorMessage directly as it's a translation key, not a translated message
            const translatedMsg = translations?.[fieldName];
            let errorMsg: string | undefined = translatedMsg;

            if (!errorMsg && typeof validatorResult === 'string') {
              if (validatorResult.startsWith('errors.')) {
                const keyWithoutPrefix = validatorResult.replace('errors.', '');
                // Prefer translations map, then fall back to i18next if available
                errorMsg = translations?.[keyWithoutPrefix] || (t ? (t(validatorResult) as string) : undefined);
              } else {
                errorMsg = validatorResult;
              }
            }

            if (!errorMsg) {
              errorMsg = 'Invalid value';
            }
            if (!errors[fieldName]) {
              errors[fieldName] = errorMsg;
              // Debug logging
              if (!translatedMsg && parentFieldName) {
                logger.debug(
                  `No translation found for subField ${fieldName}. Available keys: ${Object.keys(translations || {}).join(', ')}`
                );
              }
            }
          }
        } catch (err) {
          logger.error(`Error running validator function for field ${field.name}:`, err);
        }
      }

      // Run validation checks if value is present
      if (value !== undefined && value !== null && value !== '') {
        // Pattern validation
        if (field.pattern && typeof value === 'string' && value.trim() !== '') {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value.trim())) {
            if (!errors[fieldName]) {
              // Use translated error message if available, then field.errorMessage, then default
              errors[fieldName] =
                translations?.[fieldName] || field.errorMessage || translations?.defaultInvalid || 'Invalid format';
            }
          }
        }

        // MaxLength validation
        if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
          if (!errors[fieldName]) {
            const maxLengthMsg = translations?.defaultMaxLength?.replace('{max}', field.maxLength.toString());
            errors[fieldName] = maxLengthMsg || `Must be ${field.maxLength} characters or fewer`;
          }
        }

        // Run validate function if provided (cross-field validation)
        if (field.validate) {
          try {
            const customError = field.validate(value, formData, validationAllData);
            if (customError) {
              if (!errors[fieldName]) {
                let msg: string = customError;
                if (typeof customError === 'string' && customError.startsWith('errors.')) {
                  const keyWithoutPrefix = customError.replace('errors.', '');
                  msg = translations?.[keyWithoutPrefix] || (t ? (t(customError) as string) : customError);
                }
                errors[fieldName] = msg;
              }
            }
          } catch (err) {
            logger.error(`Error running validate function for field ${field.name}:`, err);
          }
        }
      } else if (!isRequired && field.validate) {
        // Run validate function even for empty values if field is not required
        try {
          const customError = field.validate(value, formData, validationAllData);
          if (customError) {
            if (!errors[fieldName]) {
              let msg: string = customError;
              if (typeof customError === 'string' && customError.startsWith('errors.')) {
                const keyWithoutPrefix = customError.replace('errors.', '');
                msg = translations?.[keyWithoutPrefix] || (t ? (t(customError) as string) : customError);
              }
              errors[fieldName] = msg;
            }
          }
        } catch (err) {
          logger.error(`Error running validate function for field ${field.name}:`, err);
        }
      }
    }

    // Validate nested subFields if this is a radio/checkbox field with options
    if ((field.type === 'radio' || field.type === 'checkbox') && field.options) {
      let fieldValue: unknown;
      if (parentFieldName) {
        const parentValue = formData[parentFieldName];
        if (typeof parentValue === 'object' && parentValue !== null) {
          fieldValue = (parentValue as Record<string, unknown>)[field.name];
        }
        if (fieldValue === undefined) {
          fieldValue = formData[getNestedFieldName(parentFieldName, field.name)];
        }
      } else {
        fieldValue = formData[field.name] || req.body[field.name];
      }

      for (const option of field.options) {
        if (option.subFields && option.value && isOptionSelected(fieldValue, option.value, field.type)) {
          // Validate each subField recursively
          for (const [subFieldName, subField] of Object.entries(option.subFields)) {
            // Set the name on the subField if not already set
            const subFieldWithName = { ...subField, name: subFieldName };
            validateField(subFieldWithName, field.name, option.value);
          }
        }
      }
    }
  };

  // Validate all top-level fields
  for (const field of fields) {
    validateField(field);
  }

  return errors;
}
