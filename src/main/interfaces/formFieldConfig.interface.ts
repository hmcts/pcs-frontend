import type { Request } from 'express';

import type { TranslationContent } from '../modules/steps';

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
  // Backward compatible: text property still supported
  text?: string;
  // Divider text for visual separation of options
  divider?: string;
  // Translation key for option text (backward compatible)
  translationKey?: string;
  // Dynamic label function (takes translations object, returns string)
  label?: string | ((translations: Record<string, string>) => string);
  // Conditional HTML/text to display when this option is selected
  conditionalText?: string | ((translations: Record<string, string>) => string);
  // Nested subFields that appear when this option is selected
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
  // Label can be a string or a function that takes translations and returns a string
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
  // Legend classes for radio/checkbox/date fieldsets
  legendClasses?: string;
  // Pre-processed component configuration for template rendering
  component?: Record<string, unknown>;
  componentType?: ComponentType;
  // Cross-field validation function
  // Returns error message string if validation fails, undefined if valid
  validate?: (
    value: unknown,
    formData: Record<string, unknown>,
    allData: Record<string, unknown>
  ) => string | undefined;
  // Field-level validator function (simpler than validate, returns boolean or error message string)
  // Only validates when field is visible/shown
  validator?: (
    value: unknown,
    formData?: Record<string, unknown>,
    allData?: Record<string, unknown>
  ) => boolean | string;
  // For date fields: if true, disallows future and current dates
  noFutureDate?: boolean;
}

export interface TranslationKeys {
  pageTitle?: string;
  content?: string;
  [key: string]: string | undefined;
}

export interface FormBuilderConfig {
  stepName: string;
  journeyFolder: string;
  fields: FormFieldConfig[];
  beforeRedirect?: (req: Request) => Promise<void> | void;
  extendGetContent?: (req: Request, content: TranslationContent) => Record<string, unknown>;
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
