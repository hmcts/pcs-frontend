import { Request } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';

export function validateForm(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
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
