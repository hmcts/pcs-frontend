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

    if (field.required) {
      const isMissing =
        field.type === 'checkbox'
          ? !value || (Array.isArray(value) && value.length === 0)
          : !value;

      if (isMissing) {
        errors[field.name] = field.errorMessage || 'This field is required';
      }
    }
  }

  return errors;
}
