import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../../interfaces/stepFormData.interface';

import { getNestedFieldName, isOptionSelected } from './conditionalFields';

const logger = Logger.getLogger('form-builder-helpers');

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(month: number, year: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1] || 31;
}

function getDateErrorMessage(
  t?: TFunction,
  partSpecificKey?: 'invalidDay' | 'invalidMonth' | 'invalidYear' | 'futureDate',
  translations?: Record<string, string>
): string {
  if (partSpecificKey === 'futureDate' && translations?.dateFutureDate) {
    return translations.dateFutureDate;
  }
  if (!t) {
    return 'Enter a valid date';
  }
  const key = partSpecificKey ? `errors.date.${partSpecificKey}` : 'errors.date.notRealDate';
  const translated = t(key);
  return translated !== key ? translated : 'Enter a valid date';
}

function getMissingDatePartsError(missingParts: string[], t?: TFunction): string {
  if (!t) {
    return 'Enter a valid date';
  }

  const translate = (key: string, params?: Record<string, string>): string => {
    const translated = params ? t(key, params) : t(key);
    return translated !== key ? translated : 'Enter a valid date';
  };

  if (missingParts.length === 3) {
    return translate('errors.date.required');
  }

  if (missingParts.length === 2) {
    return translate('errors.date.missingTwo', { first: missingParts[0], second: missingParts[1] });
  }

  if (missingParts.length === 1) {
    return translate('errors.date.missingOne', { missingField: missingParts[0] });
  }

  return translate('errors.date.required');
}

function validateDateField(
  day: string,
  month: string,
  year: string,
  requireAllParts: boolean,
  t?: TFunction,
  noFutureDate = false,
  translations?: Record<string, string>
): string | null {
  const isNumeric = (s: string) => /^\d+$/.test(s);
  const hasDay = !!day;
  const hasMonth = !!month;
  const hasYear = !!year;
  const hasAllParts = hasDay && hasMonth && hasYear;

  if (requireAllParts && !hasAllParts) {
    const missingParts = ['day', 'month', 'year'].filter((part, idx) => {
      return (idx === 0 && !hasDay) || (idx === 1 && !hasMonth) || (idx === 2 && !hasYear);
    });
    return getMissingDatePartsError(missingParts, t);
  }

  if (!requireAllParts && !hasDay && !hasMonth && !hasYear) {
    return null;
  }

  const validateDatePart = (
    value: string,
    maxLength: number,
    min: number,
    max: number,
    errorKey: 'invalidDay' | 'invalidMonth' | 'invalidYear',
    noLeadingZero = false
  ): string | null => {
    if (!value) {
      return null;
    }
    const isInvalidFormat = !isNumeric(value) || value.length > maxLength || (noLeadingZero && value.startsWith('0'));
    if (isInvalidFormat) {
      return getDateErrorMessage(t, errorKey, translations);
    }
    const num = parseInt(value, 10);
    return num < min || num > max ? getDateErrorMessage(t, errorKey, translations) : null;
  };

  const dayError = validateDatePart(day, 2, 1, 31, 'invalidDay');
  if (dayError) {
    return dayError;
  }

  const monthError = validateDatePart(month, 2, 1, 12, 'invalidMonth');
  if (monthError) {
    return monthError;
  }

  const yearError = validateDatePart(year, 4, 1, 9999, 'invalidYear', true);
  if (yearError) {
    return yearError;
  }

  if (!hasAllParts) {
    return null;
  }

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
    return null;
  }

  const maxDays = getDaysInMonth(monthNum, yearNum);
  if (dayNum > maxDays) {
    return getDateErrorMessage(t, undefined, translations);
  }

  if (noFutureDate) {
    const inputDate = new Date(yearNum, monthNum - 1, dayNum);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate >= today) {
      return getDateErrorMessage(t, 'futureDate', translations);
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
  const keyMap: Record<string, string> = {
    required: 'dateRequired',
    missingOne: 'dateMissingOne',
    missingTwo: 'dateMissingTwo',
    futureDate: 'dateFutureDate',
  };
  return keyMap[nestedKey] || null;
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
      value =
        typeof parentValue === 'object' && parentValue !== null
          ? (parentValue as Record<string, unknown>)[field.name]
          : req.body[fieldName] || formData[fieldName];
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

      if (field.validator && value !== undefined && !errors[fieldName]) {
        try {
          const validatorResult = field.validator(dateValue, formData, validationAllData);
          if (validatorResult !== true) {
            errors[fieldName] = typeof validatorResult === 'string' ? validatorResult : 'Invalid date';
          }
        } catch (err) {
          logger.error(`Error running validator function for field ${field.name}:`, err);
        }
      }

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
        errors[fieldName] = field.errorMessage || translations?.defaultRequired || 'This field is required';
      }

      if (field.validator && value !== undefined && value !== null && value !== '') {
        try {
          const validatorResult = field.validator(value, formData, validationAllData);
          if (validatorResult !== true && !errors[fieldName]) {
            errors[fieldName] = typeof validatorResult === 'string' ? validatorResult : 'Invalid value';
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
            if (customError && !errors[fieldName]) {
              errors[fieldName] = customError;
            }
          } catch (err) {
            logger.error(`Error running validate function for field ${field.name}:`, err);
          }
        }
      } else if (!isRequired && field.validate) {
        try {
          const customError = field.validate(value, formData, validationAllData);
          if (customError && !errors[fieldName]) {
            errors[fieldName] = customError;
          }
        } catch (err) {
          logger.error(`Error running validate function for field ${field.name}:`, err);
        }
      }
    }

    if ((field.type === 'radio' || field.type === 'checkbox') && field.options) {
      const fieldValue = parentFieldName
        ? (() => {
            const parentValue = formData[parentFieldName];
            const nestedValue =
              typeof parentValue === 'object' && parentValue !== null
                ? (parentValue as Record<string, unknown>)[field.name]
                : undefined;
            return nestedValue ?? formData[getNestedFieldName(parentFieldName, field.name)];
          })()
        : formData[field.name] || req.body[field.name];

      for (const option of field.options) {
        if (option.subFields && isOptionSelected(fieldValue, option.value, field.type)) {
          for (const [subFieldName, subField] of Object.entries(option.subFields)) {
            validateField({ ...subField, name: subFieldName }, field.name, option.value);
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
