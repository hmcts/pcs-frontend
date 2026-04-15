import type { Request } from 'express';

import type { JourneyFlowConfig } from './stepFlow.interface';

export type FormFieldType =
  | 'radio'
  | 'checkbox'
  | 'text'
  | 'date'
  | 'textarea'
  | 'character-count'
  | 'postcodeLookup'
  | 'file';
export type ComponentType =
  | 'input'
  | 'textarea'
  | 'characterCount'
  | 'radios'
  | 'checkboxes'
  | 'dateInput'
  | 'postcodeLookup'
  | 'fileUpload';

export interface FormFieldOption {
  value?: string;
  text?: string;
  divider?: string;
  translationKey?: string;
  label?: string | ((translations: Record<string, string>) => string);
  hint?: string | ((translations: Record<string, string>) => string);
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
  // Prefix text displayed before the input field (e.g., '£' for currency).
  // Used to show units or symbols that help users understand the format.
  // Follows GOV.UK Design System: https://design-system.service.gov.uk/components/text-input/#prefixes-and-suffixes
  // The prefix is visually displayed but not included in the field's value.
  prefix?: {
    text: string;
  };
  attributes?: Record<string, unknown>;
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
  // File upload configuration
  accept?: string;
  maxFileSize?: number;
  uploadUrl?: string;
  deleteUrl?: string;
  // For date fields: prevent future dates from being entered
  noFutureDate?: boolean;
  noCurrentDate?: boolean;
  noPastDate?: boolean;
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

export interface FormBuilderConfig {
  stepName: string;
  journeyFolder: string;
  fields: FormFieldConfig[];
  beforeRedirect?: (req: Request) => Promise<void> | void;
  beforeGet?: (req: Request) => Promise<void> | void;
  extendGetContent?: ExtendGetContent;
  // Prepopulates form fields from CCD on GET requests (e.g., when user returns to edit their answer).
  // Only runs on GET - POST uses submitted body to preserve user input during validation errors.
  getInitialFormData?: GetInitialFormData;
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
