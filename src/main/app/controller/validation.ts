import { Request } from 'express';

export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text';
  required?: boolean;
  errorMessage?: string;
}


export function validateForm(req: Request, fields: FormFieldConfig[]) {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = req.body[field.name];

    const isMissing =
      field.type === 'checkbox'
        ? !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')
        : value === undefined || value === null || value === '';

    if (field.required && isMissing) {
      errors[field.name] = field.errorMessage || 'This field is required';
    }
  }

  return errors;
}
