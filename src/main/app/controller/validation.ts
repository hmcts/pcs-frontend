import { Request } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';

export function validateForm(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (field.type === 'date') {
      const day = req.body[`${field.name}-day`];
      const month = req.body[`${field.name}-month`];
      const year = req.body[`${field.name}-year`];

      const isMissing =
        !day ||
        !month ||
        !year ||
        (typeof day === 'string' && day.trim() === '') ||
        (typeof month === 'string' && month.trim() === '') ||
        (typeof year === 'string' && year.trim() === '');

      if (field.required && isMissing) {
        errors[field.name] = field.errorMessage || translations?.defaultRequired || 'This field is required';
        continue;
      }

      if (!isMissing) {
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);

        if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
          errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
          continue;
        }

        if (
          dayNum < 1 ||
          dayNum > 31 ||
          monthNum < 1 ||
          monthNum > 12 ||
          yearNum < 1900 ||
          yearNum > new Date().getFullYear()
        ) {
          errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
          continue;
        }

        const date = new Date(yearNum, monthNum - 1, dayNum);
        if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
          errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Enter a valid date';
          continue;
        }
      }
      continue;
    }

    const value = req.body[field.name];

    const isMissing =
      field.type === 'checkbox'
        ? !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')
        : value === undefined || value === null || value === '';

    if (field.required && isMissing) {
      errors[field.name] = field.errorMessage || translations?.defaultRequired || 'This field is required';
      continue;
    }

    if (field.pattern && typeof value === 'string' && value.trim() !== '') {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value.trim())) {
        errors[field.name] = field.errorMessage || translations?.defaultInvalid || 'Invalid format';
      }
    }
  }

  return errors;
}
