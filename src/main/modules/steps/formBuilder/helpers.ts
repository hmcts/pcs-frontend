import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../../interfaces/stepFormData.interface';

import { getNestedFieldName, isOptionSelected } from './conditionalFields';

const logger = Logger.getLogger('form-builder-helpers');

/**
 * Validates if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Gets the maximum number of days in a month for a given year
 */
function getDaysInMonth(month: number, year: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1] || 31;
}

/**
 * Gets the appropriate date validation error message
 * Priority: dateInvalidDate > part-specific error > default message
 * @param translations - Optional translation object for error messages
 * @param partSpecificKey - Optional specific part error key (dateInvalidDay, dateInvalidMonth, dateInvalidYear)
 * @returns Error message string
 */
function getDateErrorMessage(
  translations?: Record<string, string>,
  partSpecificKey?: 'dateInvalidDay' | 'dateInvalidMonth' | 'dateInvalidYear'
): string {
  return translations?.dateInvalidDate || (partSpecificKey && translations?.[partSpecificKey]) || 'Enter a valid date';
}

/**
 * Validates date field format and logical validity
 * Returns error message if invalid, null if valid
 * @param day - Day value (can be empty)
 * @param month - Month value (can be empty)
 * @param year - Year value (can be empty)
 * @param requireAllParts - If true, all parts must be provided
 * @param translations - Optional translation object for error messages
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMissingDatePartsError(missingParts: string[], translations?: Record<string, string>): string {
  if (missingParts.length === 3) {
    return translations?.dateRequired || translations?.defaultRequired || 'Enter a date';
  }

  if (missingParts.length === 2) {
    const [first, second] = missingParts;
    const key = `dateMissing${capitalizeFirst(first)}And${capitalizeFirst(second)}`;
    if (translations?.[key]) {
      return translations[key];
    }
    const fallbackKey = translations?.dateMissingTwo;
    if (fallbackKey) {
      return fallbackKey.replace('[missing field]', first).replace('[missing field]', second);
    }
    return `Date must include a ${first} and ${second}`;
  }

  if (missingParts.length === 1) {
    const part = missingParts[0];
    const key = `dateMissing${capitalizeFirst(part)}`;
    return translations?.[key] || `Date must include a ${part}`;
  }

  return translations?.dateRequired || 'Enter a date';
}

function validateDateField(
  day: string,
  month: string,
  year: string,
  requireAllParts: boolean,
  translations?: Record<string, string>
): string | null {
  const isNumeric = (s: string) => /^\d+$/.test(s);
  const hasDay = !!day;
  const hasMonth = !!month;
  const hasYear = !!year;
  const hasAnyPart = hasDay || hasMonth || hasYear;
  const hasAllParts = hasDay && hasMonth && hasYear;

  if (requireAllParts && !hasAllParts) {
    const missingParts: string[] = [];
    if (!hasDay) {
      missingParts.push('day');
    }
    if (!hasMonth) {
      missingParts.push('month');
    }
    if (!hasYear) {
      missingParts.push('year');
    }
    return getMissingDatePartsError(missingParts, translations);
  }

  if (!requireAllParts && !hasAnyPart) {
    return null;
  }

  const validateDatePart = (
    value: string,
    maxLength: number,
    min: number,
    max: number,
    errorKey: 'dateInvalidDay' | 'dateInvalidMonth' | 'dateInvalidYear',
    noLeadingZero = false
  ): string | null => {
    if (!value) {
      return null;
    }
    if (!isNumeric(value) || value.length > maxLength || (noLeadingZero && value.startsWith('0'))) {
      return getDateErrorMessage(translations, errorKey);
    }
    const num = parseInt(value, 10);
    if (num < min || num > max) {
      return getDateErrorMessage(translations, errorKey);
    }
    return null;
  };

  const dayError = validateDatePart(day, 2, 1, 31, 'dateInvalidDay');
  if (dayError) {
    return dayError;
  }

  const monthError = validateDatePart(month, 2, 1, 12, 'dateInvalidMonth');
  if (monthError) {
    return monthError;
  }

  const yearError = validateDatePart(year, 4, 1, 9999, 'dateInvalidYear', true);
  if (yearError) {
    return yearError;
  }

  if (hasAllParts) {
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum)) {
      const maxDays = getDaysInMonth(monthNum, yearNum);
      if (dayNum > maxDays) {
        return getDateErrorMessage(translations);
      }
    }
  }

  return null;
}

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

function getDateTranslationKey(nestedKey: string): string | null {
  if (nestedKey === 'required') {
    return 'dateRequired';
  }
  if (nestedKey.startsWith('missing')) {
    return `date${capitalizeFirst(nestedKey)}`;
  }
  return null;
}

export function getCustomErrorTranslations(t: TFunction, fields: FormFieldConfig[]): Record<string, string> {
  const stepSpecificErrors: Record<string, string> = {};
  const nestedKeys = [
    'required',
    'custom',
    'missingDay',
    'missingMonth',
    'missingYear',
    'missingDayAndMonth',
    'missingDayAndYear',
    'missingMonthAndYear',
  ];

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
  allFormData?: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const formData: Record<string, unknown> = { ...req.body };
  const mergedAllData: Record<string, unknown> =
    allFormData ||
    (req.session.formData
      ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
      : {});
  const validationAllData = { ...mergedAllData, ...formData };

  const validateField = (field: FormFieldConfig, parentFieldName?: string, parentOptionValue?: string): void => {
    if (parentFieldName && parentOptionValue) {
      const parentValue = formData[parentFieldName] || validationAllData[parentFieldName];
      const parentField = fields.find(f => f.name === parentFieldName);
      const fieldType = parentField?.type === 'checkbox' ? 'checkbox' : 'radio';

      if (!isOptionSelected(parentValue, parentOptionValue, fieldType)) {
        return;
      }
    }

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

    const fieldName = parentFieldName ? getNestedFieldName(parentFieldName, field.name) : field.name;
    let value: unknown;

    if (parentFieldName) {
      const parentValue = formData[parentFieldName];
      if (typeof parentValue === 'object' && parentValue !== null) {
        value = (parentValue as Record<string, unknown>)[field.name];
      } else {
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

      const dateError = validateDateField(day, month, year, isRequired, translations);
      if (dateError) {
        errors[fieldName] = dateError;
      }

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

      if (field.validate && (!errors[fieldName] || Object.keys(errors).length === 0)) {
        const dateValue = { day, month, year };
        try {
          const customError = field.validate(dateValue, formData, validationAllData);
          if (customError) {
            let errorMessage = customError;
            if (customError.startsWith('errors.')) {
              const translationKey = customError.replace('errors.', '');
              errorMessage = translations?.[translationKey] || customError;
            }
            errors[fieldName] = errorMessage;
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

      if (value !== undefined && value !== null && value !== '') {
        if (field.pattern && typeof value === 'string' && value.trim() !== '') {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value.trim())) {
            if (!errors[fieldName]) {
              errors[fieldName] = field.errorMessage || translations?.defaultInvalid || 'Invalid format';
            }
          }
        }

        if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
          if (!errors[fieldName]) {
            const maxLengthMsg = translations?.defaultMaxLength?.replace('{max}', field.maxLength.toString());
            errors[fieldName] = field.errorMessage || maxLengthMsg || `Must be ${field.maxLength} characters or fewer`;
          }
        }

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
          for (const [subFieldName, subField] of Object.entries(option.subFields)) {
            const subFieldWithName = { ...subField, name: subFieldName };
            validateField(subFieldWithName, field.name, option.value);
          }
        }
      }
    }
  };

  for (const field of fields) {
    validateField(field);
  }

  return errors;
}
