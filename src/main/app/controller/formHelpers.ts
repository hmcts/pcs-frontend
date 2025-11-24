import type { Request } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';

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
  translations?: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (field.type === 'date') {
      // Date fields have day, month, year structure
      const day = req.body[`${field.name}-day`]?.trim() || '';
      const month = req.body[`${field.name}-month`]?.trim() || '';
      const year = req.body[`${field.name}-year`]?.trim() || '';

      if (field.required) {
        if (!day || !month || !year) {
          errors[field.name] = field.errorMessage || translations?.defaultRequired || 'Enter your date of birth';
          continue;
        }

        // Basic validation for date parts
        const isNumeric = (s: string) => /^\d+$/.test(s);
        if (!isNumeric(day) || !isNumeric(month) || !isNumeric(year)) {
          errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
          continue;
        }

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
          errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
        }
      }
    } else {
      const value = req.body[field.name];

      const isMissing =
        field.type === 'checkbox'
          ? !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')
          : value === undefined || value === null || value === '';

      if (field.required && isMissing) {
        errors[field.name] = field.errorMessage || translations?.defaultRequired || 'This field is required';
        continue;
      }

      // Only validate pattern and maxLength if value is provided
      if (value !== undefined && value !== null && value !== '') {
        if (field.pattern && typeof value === 'string' && value.trim() !== '') {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value.trim())) {
            errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Invalid format';
          }
        }

        // Check maxLength for text and textarea fields
        if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
          const maxLengthMsg = translations?.defaultMaxLength?.replace('{max}', field.maxLength.toString());
          errors[field.name] = field.errorMessage || maxLengthMsg || `Must be ${field.maxLength} characters or fewer`;
        }
      }
    }
  }

  return errors;
}
