import type { Request } from 'express';
import { z } from 'zod/v4';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * Get all form data from session across all steps
 */
export function getAllFormData(req: Request): Record<string, unknown> {
  return req.session.formData || {};
}

/**
 * Create a Zod schema for a form field
 */
function createFieldSchema(
  field: FormFieldConfig,
  formData: Record<string, unknown>,
  allFormData: Record<string, unknown>
): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Determine if field is required
  const isRequired = (): boolean => {
    if (!field.required) {
      return false;
    }
    if (typeof field.required === 'boolean') {
      return field.required;
    }
    if (typeof field.required === 'function') {
      try {
        return field.required(formData, allFormData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error evaluating required function:', err);
        return false;
      }
    }
    return false;
  };

  switch (field.type) {
    case 'date': {
      const dateSchema = z
        .object({
          day: z.string().trim(),
          month: z.string().trim(),
          year: z.string().trim(),
        })
        .refine(
          obj => {
            const day = obj.day?.trim() || '';
            const month = obj.month?.trim() || '';
            const year = obj.year?.trim() || '';

            // Check all parts are present
            if (!day || !month || !year) {
              return false;
            }

            // Check all parts are numeric
            const isNumeric = (s: string) => /^\d+$/.test(s);
            if (!isNumeric(day) || !isNumeric(month) || !isNumeric(year)) {
              return false;
            }

            // Check valid ranges
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
              return false;
            }

            // Check if date is valid (e.g., not 31 Feb)
            const date = new Date(yearNum, monthNum - 1, dayNum);
            if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
              return false;
            }

            return true;
          },
          { message: field.errorMessage || 'Enter a valid date' }
        );

      if (isRequired()) {
        schema = dateSchema;
      } else {
        schema = dateSchema.optional();
      }
      break;
    }

    case 'checkbox': {
      const checkboxSchema = z
        .array(z.string())
        .or(z.string())
        .transform(val => {
          if (typeof val === 'string') {
            return [val];
          }
          return val;
        });

      if (isRequired()) {
        schema = checkboxSchema.refine(val => Array.isArray(val) && val.length > 0, {
          message: field.errorMessage || 'Select at least one option',
        });
      } else {
        schema = checkboxSchema.optional();
      }
      break;
    }

    case 'radio': {
      if (isRequired()) {
        schema = z.string().min(1, { message: field.errorMessage || 'Select an option' });
      } else {
        schema = z.string().optional();
      }
      break;
    }

    case 'textarea':
    case 'character-count':
    case 'text': {
      let textSchema: z.ZodString = z.string().trim();

      if (field.maxLength) {
        textSchema = textSchema.max(field.maxLength, {
          message: field.errorMessage || `Must be ${field.maxLength} characters or fewer`,
        });
      }

      if (field.pattern) {
        textSchema = textSchema.regex(new RegExp(field.pattern), {
          message: field.errorMessage || 'Invalid format',
        });
      }

      if (isRequired()) {
        schema = textSchema.min(1, { message: field.errorMessage || 'This field is required' });
      } else {
        schema = textSchema.optional();
      }
      break;
    }

    default: {
      if (isRequired()) {
        schema = z.string().min(1, { message: field.errorMessage || 'This field is required' });
      } else {
        schema = z.string().optional();
      }
    }
  }

  return schema;
}

/**
 * Validate form data using Zod v4
 * Supports function-based required rules and cross-field validation
 */
export function validateFormWithZod(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>
): ValidationErrors {
  const errors: ValidationErrors = {};
  const formData: Record<string, unknown> = { ...req.body };
  const allFormData = getAllFormData(req);

  // Process date fields
  for (const field of fields) {
    if (field.type === 'date') {
      const day = req.body[`${field.name}-day`]?.trim() || '';
      const month = req.body[`${field.name}-month`]?.trim() || '';
      const year = req.body[`${field.name}-year`]?.trim() || '';
      formData[field.name] = { day, month, year };
    } else if (field.type === 'checkbox') {
      // Normalize checkbox values
      const value = req.body[field.name];
      if (value && typeof value === 'string') {
        formData[field.name] = [value];
      } else {
        formData[field.name] = value;
      }
    } else {
      formData[field.name] = req.body[field.name];
    }
  }

  // Validate each field
  for (const field of fields) {
    const schema = createFieldSchema(field, formData, allFormData);
    const fieldValue = formData[field.name];

    // For date fields, validate the object structure
    if (field.type === 'date') {
      const result = schema.safeParse(fieldValue);
      if (!result.success) {
        const firstError = result.error.issues[0];
        errors[field.name] = firstError?.message || translations?.defaultInvalid || 'Enter a valid date';
      }
    } else {
      const result = schema.safeParse(fieldValue);
      if (!result.success) {
        const firstError = result.error.issues[0];
        errors[field.name] =
          firstError?.message ||
          field.errorMessage ||
          translations?.defaultRequired ||
          translations?.defaultInvalid ||
          'This field is required';
      }
    }
  }

  return errors;
}
