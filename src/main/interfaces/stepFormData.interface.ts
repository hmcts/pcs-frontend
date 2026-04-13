import { RequestHandler } from 'express';

import { GetController, type SupportedLang } from '@modules/steps';

export interface ErrorField {
  field: string;
  text: string;
}

export interface StepFormData {
  error?: ErrorField | string | undefined;
  answer?: string;
  choices?: string[] | string;
  [key: string]: unknown;
}

export interface StepDefinition {
  url: string;
  name: string;
  view: string;
  stepDir: string;
  getController: GetController | ((lang?: SupportedLang) => GetController);
  postController?: { post: RequestHandler };
  /** Run after auth and before POST handler (e.g. multipart parser for file uploads). */
  postMiddleware?: RequestHandler[];
  middleware?: RequestHandler[];
  showCancelButton?: boolean;
}
