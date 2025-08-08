import { RequestHandler } from 'express';

import { GetController } from '../app/controller/GetController';

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
  generateContent: (lang?: string) => StepFormData;
  getController: GetController | ((lang?: string) => GetController);
  postController?: { post: RequestHandler };
  middleware?: RequestHandler[];
}
