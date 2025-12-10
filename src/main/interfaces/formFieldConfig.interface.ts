import type { Request } from 'express';

import type { TranslationContent } from '../modules/steps';

export type FormFieldType = 'radio' | 'checkbox' | 'text' | 'date' | 'textarea' | 'character-count';
export type ComponentType = 'input' | 'textarea' | 'characterCount' | 'radios' | 'checkboxes' | 'dateInput';

export interface FormFieldOption {
  value: string;
  text?: string;
  translationKey?: string;
}

export interface FormFieldConfig {
  name: string;
  type: FormFieldType;
  required?: boolean | ((formData: Record<string, unknown>, allData: Record<string, unknown>) => boolean);
  pattern?: string;
  maxLength?: number;
  errorMessage?: string;
  label?: string;
  hint?: string;
  translationKey?: {
    label?: string;
    hint?: string;
  };
  options?: FormFieldOption[];
  classes?: string;
  attributes?: Record<string, unknown>;
  // Pre-processed component configuration for template rendering
  component?: Record<string, unknown>;
  componentType?: ComponentType;
}

export interface TranslationKeys {
  pageTitle?: string;
  content?: string;
}

export interface FormBuilderConfig {
  stepName: string;
  journeyFolder: string;
  fields: FormFieldConfig[];
  beforeRedirect?: (req: Request) => Promise<void> | void;
  extendGetContent?: (req: Request, content: TranslationContent) => Record<string, unknown>;
  stepDir: string;
  translationKeys?: TranslationKeys;
}

export interface ComponentConfig {
  component: Record<string, unknown>;
  componentType: ComponentType;
}
