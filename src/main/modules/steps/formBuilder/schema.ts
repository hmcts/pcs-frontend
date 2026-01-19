import { Logger } from '@hmcts/nodejs-logging';
import { z } from 'zod/v4';

import type {
  FormBuilderConfig,
  FormFieldConfig,
  FormFieldOption,
} from '../../../interfaces/formFieldConfig.interface';

const logger = Logger.getLogger('form-builder-schema');

// Function type for label (string or function)
const LabelFunctionSchema = z.union([
  z.string(),
  z.custom<(translations: Record<string, string>) => string>(val => typeof val === 'function', {
    message: 'label must be a string or a function',
  }),
]);

// Function type for conditionalText (string or function)
const ConditionalTextFunctionSchema = z
  .union([
    z.string(),
    z.custom<(translations: Record<string, string>) => string>(val => typeof val === 'function', {
      message: 'conditionalText must be a string or a function',
    }),
  ])
  .optional();

// Function type for validator
const ValidatorFunctionSchema = z
  .custom<(value: unknown, formData?: Record<string, unknown>, allData?: Record<string, unknown>) => boolean | string>(
    val => typeof val === 'function',
    {
      message: 'validator must be a function',
    }
  )
  .optional();

// Function type for required validation
const RequiredFunctionSchema = z.custom<
  (formData: Record<string, unknown>, allData: Record<string, unknown>) => boolean
>(val => typeof val === 'function', {
  message: 'required must be a boolean or a function',
});

// Function type for validate validation
const ValidateFunctionSchema = z.custom<
  (value: unknown, formData: Record<string, unknown>, allData: Record<string, unknown>) => string | undefined
>(val => typeof val === 'function', {
  message: 'validate must be a function',
});

// Recursive schemas using z.lazy() for nested conditional fields
// FormFieldConfig schema - defined with lazy self-reference for recursive subFields
export const FormFieldConfigSchema: z.ZodType<FormFieldConfig> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum(['radio', 'checkbox', 'text', 'date', 'textarea', 'character-count']),
    required: z.union([z.boolean(), RequiredFunctionSchema]).optional(),
    pattern: z.string().optional(),
    maxLength: z.number().optional(),
    errorMessage: z.string().optional(),
    // Label can be string or function
    label: LabelFunctionSchema.optional(),
    labelClasses: z.string().optional(),
    hint: z.string().optional(),
    translationKey: z
      .object({
        label: z.string().optional(),
        hint: z.string().optional(),
      })
      .optional(),
    options: z.array(FormFieldOptionSchema).optional(),
    classes: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    // Pre-processed component configuration for template rendering
    component: z.record(z.string(), z.unknown()).optional(),
    componentType: z.enum(['input', 'textarea', 'characterCount', 'radios', 'checkboxes', 'dateInput']).optional(),
    // Cross-field validation function
    validate: ValidateFunctionSchema.optional(),
    // Field-level validator function
    validator: ValidatorFunctionSchema,
    // For date fields: if true, disallows future and current dates
    noFutureDate: z.boolean().optional(),
  })
);

// FormFieldOption schema with nested conditional fields support
export const FormFieldOptionSchema: z.ZodType<FormFieldOption> = z.lazy(() =>
  z.object({
    value: z.string(),
    // Backward compatible properties
    text: z.string().optional(),
    translationKey: z.string().optional(),
    // New conditional fields support
    label: LabelFunctionSchema.optional(),
    conditionalText: ConditionalTextFunctionSchema,
    // Recursive subFields - references FormFieldConfigSchema
    subFields: z.record(z.string(), FormFieldConfigSchema).optional(),
  })
);

// TranslationKeys schema
const TranslationKeysSchema = z.object({
  pageTitle: z.string().optional(),
  content: z.string().optional(),
});

// Function type for beforeRedirect
const BeforeRedirectFunctionSchema = z
  .custom<(req: unknown) => Promise<void> | void>(val => typeof val === 'function', {
    message: 'beforeRedirect must be a function',
  })
  .optional();

// Function type for extendGetContent
const ExtendGetContentFunctionSchema = z
  .custom<(req: unknown, content: unknown) => Record<string, unknown>>(val => typeof val === 'function', {
    message: 'extendGetContent must be a function',
  })
  .optional();

// FormBuilderConfig schema
export const FormBuilderConfigSchema: z.ZodType<FormBuilderConfig> = z.object({
  stepName: z.string(),
  journeyFolder: z.string(),
  fields: z.array(FormFieldConfigSchema),
  beforeRedirect: BeforeRedirectFunctionSchema,
  extendGetContent: ExtendGetContentFunctionSchema,
  stepDir: z.string(),
  translationKeys: TranslationKeysSchema.optional(),
});

/**
 * Validates a FormFieldConfig against the schema
 * @param config - The FormFieldConfig to validate
 * @returns Validation result with success status and parsed data or errors
 */
export function validateFormFieldConfig(config: unknown): {
  success: boolean;
  data?: FormFieldConfig;
  errors?: z.ZodError;
} {
  const result = FormFieldConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates a FormBuilderConfig against the schema
 * @param config - The FormBuilderConfig to validate
 * @returns Validation result with success status and parsed data or errors
 */
export function validateFormBuilderConfig(config: unknown): {
  success: boolean;
  data?: FormBuilderConfig;
  errors?: z.ZodError;
} {
  const result = FormBuilderConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates FormBuilderConfig in development mode and logs errors
 * @param config - The FormBuilderConfig to validate
 * @returns The config if valid, logs errors in development mode
 */
export function validateConfigInDevelopment(config: FormBuilderConfig): FormBuilderConfig {
  if (process.env.NODE_ENV !== 'production') {
    const result = validateFormBuilderConfig(config);
    if (!result.success && result.errors) {
      logger.warn('FormBuilderConfig validation failed:', result.errors.format());
    }
  }
  return config;
}
