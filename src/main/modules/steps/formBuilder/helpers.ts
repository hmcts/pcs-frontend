import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../../interfaces/stepFormData.interface';

import { getNestedFieldName, isOptionSelected } from './conditionalFields';

const logger = Logger.getLogger('form-builder-helpers');

export function getTranslation(t: TFunction, key: string, fallback?: string): string | undefined {
  const translation = t(key);
  return translation !== key ? translation : fallback;
}

export function processFieldData(req: Request, fields: FormFieldConfig[]): void {
  for (const field of fields) {
    if (field.type === 'checkbox' && req.body[field.name]) {
      if (typeof req.body[field.name] === 'string') {
        req.body[field.name] = [req.body[field.name]];
      }
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

export function getTranslationErrors(t: TFunction, fields: FormFieldConfig[]): Record<string, string> {
  const translationErrors: Record<string, string> = {};
  for (const field of fields) {
    const errorKey = `errors.${field.name}`;
    const errorMsg = t(errorKey);
    if (errorMsg && errorMsg !== errorKey) {
      translationErrors[field.name] = errorMsg;
    }
  }
  return translationErrors;
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
  allFormData?: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

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
      if (typeof parentValue === 'object' && parentValue !== null) {
        value = (parentValue as Record<string, unknown>)[field.name];
      } else {
        // Try direct access with nested name
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

      if (isRequired) {
        if (!day || !month || !year) {
          errors[fieldName] = field.errorMessage || translations?.defaultRequired || 'Enter your date of birth';
        } else {
          const isNumeric = (s: string) => /^\d+$/.test(s);
          if (!isNumeric(day) || !isNumeric(month) || !isNumeric(year)) {
            errors[fieldName] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
          } else {
            const dayNum = parseInt(day, 10);
            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);

            if (
              dayNum < 1 ||
              dayNum > 31 ||
              monthNum < 1 ||
              monthNum > 12 ||
              yearNum < 1900 ||
              yearNum > new Date().getFullYear()
            ) {
              errors[fieldName] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
            }
          }
        }
      }

      // Run validator function if provided
      if (field.validator && value !== undefined) {
        try {
          const dateValue = { day, month, year };
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
      if (field.validate && (!errors[fieldName] || Object.keys(errors).length === 0)) {
        const dateValue = { day, month, year };
        try {
          const customError = field.validate(dateValue, formData, validationAllData);
          if (customError) {
            errors[fieldName] = customError;
          }
        } catch (err) {
          logger.error(`Error running validate function for field ${field.name}:`, err);
        }
      }
    } else {
      const isMissing =
        field.type === 'checkbox'
          ? !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')
          : value === undefined || value === null || value === '';

      if (isRequired && isMissing) {
        errors[fieldName] = field.errorMessage || translations?.defaultRequired || 'This field is required';
      }

      // Run validator function if provided (field-level validation)
      if (field.validator && value !== undefined && value !== null && value !== '') {
        try {
          const validatorResult = field.validator(value, formData, validationAllData);
          if (validatorResult !== true) {
            const errorMsg = typeof validatorResult === 'string' ? validatorResult : 'Invalid value';
            if (!errors[fieldName]) {
              errors[fieldName] = errorMsg;
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
              errors[fieldName] = field.errorMessage || translations?.defaultInvalid || 'Invalid format';
            }
          }
        }

        // MaxLength validation
        if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
          if (!errors[fieldName]) {
            const maxLengthMsg = translations?.defaultMaxLength?.replace('{max}', field.maxLength.toString());
            errors[fieldName] = field.errorMessage || maxLengthMsg || `Must be ${field.maxLength} characters or fewer`;
          }
        }

        // Run validate function if provided (cross-field validation)
        if (field.validate) {
          try {
            const customError = field.validate(value, formData, validationAllData);
            if (customError) {
              if (!errors[fieldName]) {
                errors[fieldName] = customError;
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
              errors[fieldName] = customError;
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
        if (option.subFields && isOptionSelected(fieldValue, option.value, field.type)) {
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
