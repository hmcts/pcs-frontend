import { RequestHandler } from 'express';

import { GetController } from '../app/controller/GetController';
import { type SupportedLang } from '../utils/getLanguageFromRequest';

export interface ErrorField {
  field: string;
  text: string;
}
export interface StepFormData {
  title?: string;
  error?: ErrorField | string | undefined;
  answer?: string;
  choices?: string[] | string;
  serviceName?: string;
  buttons?: {
    continue?: string;
    back?: string;
    cancel?: string;
  };
  [key: string]: unknown;
}

export interface StepDefinition {
  url: string;
  name: string;
  view: string;
  stepDir: string;
  generateContent: (lang?: SupportedLang) => StepFormData;
  getController: GetController | ((lang?: SupportedLang) => GetController);
  postController?: { post: RequestHandler };
  middleware?: RequestHandler[];

  getNextStep?: (formData: Record<string, unknown>, allData: Record<string, unknown>) => string | null; // Returns step name or null if end of journey

  getPreviousStep?: (allData: Record<string, unknown>) => string | null; // Returns step name or null if first step

  stepNumber?: number;
  section?: string;
  prerequisites?: string[]; // Step names that must be completed first
  description?: string;
}
