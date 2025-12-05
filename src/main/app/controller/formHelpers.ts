import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import { z } from 'zod';

import type { FormFieldConfig, FormRequiredPredicate } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';

const logger = Logger.getLogger('form-validation');

export interface FieldValidationError {
  field: string;
  text: string;
  anchor?: string;
}

export type ValidationErrors = Record<string, FieldValidationError>;

export const getFormData = (req: Request, stepName: string): StepFormData => {
  return req.session.formData?.[stepName] || {};
};

export const setFormData = (req: Request, stepName: string, data: StepFormData): void => {
  if (!req.session.formData) {
    req.session.formData = {};
  }
  req.session.formData[stepName] = data;
};

export const getAllFormData = (req: Request): Record<string, unknown> => {
  const aggregated: Record<string, unknown> = {};
  const sessionData = req.session?.formData || {};

  for (const stepData of Object.values(sessionData)) {
    Object.assign(aggregated, stepData);
  }

  return aggregated;
};

const evaluateRequired = (
  rule: FormFieldConfig['required'],
  formData: Record<string, unknown>,
  allFormData: Record<string, unknown>
): boolean => {
  if (!rule) {
    return false;
  }

  if (typeof rule === 'boolean') {
    return rule;
  }

  try {
    return (rule as FormRequiredPredicate)(formData, allFormData);
  } catch (error) {
    logger.error('required predicate failed', error);
    return false;
  }
};

const createFieldSchema = (
  field: FormFieldConfig,
  formData: Record<string, unknown>,
  allFormData: Record<string, unknown>,
  translations?: Record<string, string>
): z.ZodTypeAny => {
  const isRequired = evaluateRequired(field.required, formData, allFormData);
  const requiredMessage = field.errorMessage || translations?.defaultRequired || 'This field is required';
  const invalidMessage = field.errorMessage || translations?.defaultInvalid || 'Invalid format';

  switch (field.type) {
    case 'text': {
      let schema: z.ZodTypeAny = z
        .union([z.string(), z.undefined(), z.null()])
        .transform(val => (val === null || val === undefined ? '' : val))
        .pipe(z.string().trim());

      if (isRequired) {
        schema = schema.refine(val => val.length > 0, { message: requiredMessage });
      }

      if (field.pattern) {
        const regex = field.pattern instanceof RegExp ? field.pattern : new RegExp(field.pattern);
        schema = schema.refine(
          (val: string) => {
            // Skip pattern validation for empty optional fields
            if (!isRequired && val === '') {
              return true;
            }
            return regex.test(val);
          },
          { message: invalidMessage }
        );
      }

      return isRequired ? schema : schema.optional();
    }

    case 'radio': {
      let schema: z.ZodTypeAny = z
        .union([z.string(), z.undefined(), z.null()])
        .transform(val => (val === null || val === undefined ? '' : val));

      if (isRequired) {
        schema = schema.refine(val => val.length > 0, { message: requiredMessage });
      }

      return isRequired ? schema : schema.optional();
    }

    case 'checkbox': {
      const baseArraySchema = isRequired
        ? z.array(z.string()).min(1, { message: requiredMessage })
        : z.array(z.string());

      return z.preprocess(val => {
        if (val === undefined || val === null || val === '') {
          return [];
        }
        if (Array.isArray(val)) {
          return val;
        }
        if (typeof val === 'string') {
          return [val];
        }
        return [];
      }, baseArraySchema);
    }

    default:
      return z.unknown().optional();
  }
};

const convertZodErrorToValidationError = (
  field: FormFieldConfig,
  zodError: z.ZodError
): FieldValidationError | null => {
  const firstIssue = zodError.issues[0];
  if (!firstIssue) {
    return null;
  }

  return {
    field: field.name,
    text: firstIssue.message,
    anchor: field.anchor ?? field.name,
  };
};

export function validateForm(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>,
  allFormData: Record<string, unknown> = getAllFormData(req)
): ValidationErrors {
  const errors: ValidationErrors = {};
  const body = req.body || {};
  const formData = fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field.name] = body[field.name];
    return acc;
  }, {});

  const evaluationData = {
    ...allFormData,
    ...body,
  };

  for (const field of fields) {
    const fieldSchema = createFieldSchema(field, formData, evaluationData, translations);
    const value = body[field.name];

    const result = fieldSchema.safeParse(value);

    if (!result.success) {
      const error = convertZodErrorToValidationError(field, result.error);
      if (error) {
        errors[field.name] = error;
      }
      continue;
    }

    // Run custom validator if provided, even if Zod validation passed
    if (field.validator) {
      try {
        const validatorResult = field.validator(result.data, formData, evaluationData);
        if (validatorResult) {
          if (typeof validatorResult === 'string') {
            errors[field.name] = {
              field: field.name,
              text: validatorResult,
              anchor: field.anchor ?? field.name,
            };
          } else {
            errors[field.name] = {
              field: field.name,
              text: validatorResult.text,
              anchor: validatorResult.anchor ?? field.anchor ?? field.name,
            };
          }
        }
      } catch (error) {
        logger.error('custom validator failed', error);
      }
    }
  }

  return errors;
}
