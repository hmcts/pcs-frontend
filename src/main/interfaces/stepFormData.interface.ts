import { RequestHandler } from 'express';

import { GetController } from '../app/controller/GetController';
import { type SupportedLang } from '../utils/getValidatedLanguage';

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
}
