import type { Request } from 'express';

import type { JourneyFlowConfig } from './stepFlow.interface';

export type FormFieldType = 'radio' | 'checkbox' | 'text' | 'date' | 'textarea' | 'character-count' | 'postcodeLookup';
export type ComponentType =
  | 'input'
  | 'textarea'
  | 'characterCount'
  | 'radios'
  | 'checkboxes'
  | 'dateInput'
  | 'postcodeLookup';

export interface FormFieldOption {
  value?: string;
  text?: string;
  divider?: string;
  translationKey?: string;
  label?: string | ((translations: Record<string, string>) => string);
  conditionalText?: string | ((translations: Record<string, string>) => string);
  // SubFields appear conditionally when this option is selected (e.g., text inputs under "No" radio button)
  subFields?: Record<string, FormFieldConfig>;
}

export interface FormFieldConfig {
  name: string;
  type: FormFieldType;
  id?: string;
  required?: boolean | ((formData: Record<string, unknown>, allData: Record<string, unknown>) => boolean);
  pattern?: string;
  maxLength?: number;
  errorMessage?: string;
  label?: string | ((translations: Record<string, string>) => string);
  labelClasses?: string;
  hint?: string;
  translationKey?: {
    label?: string;
    hint?: string;
  };
  options?: FormFieldOption[];
  classes?: string;
  attributes?: Record<string, unknown>;
  // Optional prefix for input fields (e.g. currency symbol)
  prefix?: {
    text: string;
  };
  legendClasses?: string;
  // Pre-built component config for Nunjucks template rendering
  component?: Record<string, unknown>;
  componentType?: ComponentType;
  // Field value used for prepopulation from CCD (via getInitialFormData)
  value?: unknown;
  // Cross-field validation that returns error message string, or undefined if valid
  validate?: (
    value: unknown,
    formData: Record<string, unknown>,
    allData: Record<string, unknown>
  ) => string | undefined;
  // Simpler field-level validation that returns boolean or error message
  validator?: (
    value: unknown,
    formData?: Record<string, unknown>,
    allData?: Record<string, unknown>
  ) => boolean | string;
  // For date fields: prevent future dates from being entered
  noFutureDate?: boolean;
  noCurrentDate?: boolean;
  isPageHeading?: boolean;
}

export interface TranslationKeys {
  pageTitle?: string;
  content?: string;
  [key: string]: string | undefined;
}

export type BuiltFormContent = {
  fields: (FormFieldConfig & {
    componentType?: string;
    component?: Record<string, unknown>;
  })[];
  errorSummary?: unknown;
  errors?: Record<string, string>;
  [key: string]: unknown;
};

type MaybePromise<T> = T | Promise<T>;
export type ExtendGetContent = (
  req: Request,
  formContent: BuiltFormContent
) => MaybePromise<Partial<BuiltFormContent> & Record<string, unknown>>;

// Prepopulation function that extracts field values from CCD case data for GET requests.
// Use dot-notation for subFields (e.g., 'nameConfirmation.firstName') to match nested field names.
export type GetInitialFormData = (req: Request) => MaybePromise<Record<string, unknown>>;

export type FormFieldValue = string | string[] | Record<string, unknown>;

export interface CcdMappingContext {
  // CCD case data snapshot from START callback, available during draft save.
  // Passed as plain data to keep mappers decoupled from Express req/res.
  // Use this when your mapper needs to read other parts of the case (e.g., copying claimant-entered values).
  caseData?: Record<string, unknown>;
}

// Transforms frontend form values into CCD backend format.
// Takes form field value(s) and optional context, returns object ready for CCD payload.
export type ValueMapper = (valueOrFormData: FormFieldValue, ctx?: CcdMappingContext) => Record<string, unknown>;

// Declarative mapping that tells formBuilder how to save form data to CCD draft.
// Enables automatic draft persistence without manual beforeRedirect code.
export interface CcdFieldMapping {
  backendPath: string; // Where in CCD structure to save (dot-path like 'possessionClaimResponse.defendantResponses')
  frontendField?: string; // Single field to extract from form data
  frontendFields?: string[]; // Multiple fields to extract (e.g., parent + subFields)
  valueMapper: ValueMapper; // Function that transforms frontend values to CCD format
}

export interface FormBuilderConfig {
  stepName: string;
  journeyFolder: string;
  fields: FormFieldConfig[];
  beforeRedirect?: (req: Request) => Promise<void> | void;
  extendGetContent?: ExtendGetContent;
  // Prepopulates form fields from CCD on GET requests (e.g., when user returns to edit their answer).
  // Only runs on GET - POST uses submitted body to preserve user input during validation errors.
  getInitialFormData?: GetInitialFormData;
  // Declarative CCD draft persistence. When provided, formBuilder automatically saves form data
  // to CCD on POST before running your custom beforeRedirect. No manual draft saving needed.
  ccdMapping?: CcdFieldMapping;
  stepDir: string;
  translationKeys?: TranslationKeys;
  customTemplate?: string;
  basePath?: string;
  flowConfig?: JourneyFlowConfig;
  showCancelButton?: boolean;
}

export interface ComponentConfig {
  component: Record<string, unknown>;
  componentType: ComponentType;
}
